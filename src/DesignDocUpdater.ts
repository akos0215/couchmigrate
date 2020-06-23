
import { createLogger, Logger } from 'winston';
import { default as delay } from 'delay';

import { DBSettings } from './model';
import { CouchDBClient } from './CouchdbClient';
import * as utils from './utils';

export const updateDesignDocument = async (dbSettings: DBSettings, docName: string, docContent: any): Promise<void> => {
      const logger = createLogger();
      const dbClient = new CouchDBClient(dbSettings, logger);
      /* steps:
        1.: Check DB exists (is this still needed?)
        2. fetch document from DB
        2. compare document with that local
        3. copy to previous document to _OLD
        4. copy new document as _NEW
        5. trigger index building
        6. iteratively check index
        7. copy new to live
        8. delete _old
        9 delete _new
      */

      const storedDoc = await dbClient.fetchDocument(docName);
      if (utils.areDocumentsEquals(storedDoc, docContent)) {
        logger.log('log', '** The design document is the same, no need to migrate! **');

        return Promise.resolve();
      }

      const bcpDesignDocName = `${docName}_OLD`;
      const newDesignDocName = `${docName}_NEW`;
      await dbClient.copyDocument(docName, bcpDesignDocName);
      const newDesignDoc = {...docContent, _id: newDesignDocName };
      const upsertedDesignDoc = await dbClient.upsertDocument(newDesignDoc);

      // trigger index building
      const designDocName = newDesignDoc._id.replace(/_design\//, '');

      await delay(3000);
      if (newDesignDoc.views) {
        const view = Object.keys(newDesignDoc.views)[0];
        await dbClient.view(designDocName, view, { limit: 1 });
      } else if (newDesignDoc.indexes) {
        const search = Object.keys(newDesignDoc.indexes)[0];
        await dbClient.search(designDocName, search, {q: 'xyz'});
      } else {
        logger.log('log', '** Design document has no views, no need to trigger view build **');

        return Promise.resolve();
      }
      // iteratively check the index by send query/search requests
      let numTasks = 1;
      do {
        const tasks = await dbClient.request({path: '_active_tasks'});
        numTasks = tasks.filter(
          (task: any) => task.type === 'indexer' || task.type === 'search_indexer' &&
        task.design_document === newDesignDocName).length;

        if (numTasks > 0) await delay(10000);
      } while (numTasks > 0);

      await dbClient.copyDocument(newDesignDocName, docName);
      await dbClient.deleteDocument(newDesignDocName);

      logger.log('log', '** Finished design doc updating **');

      return dbClient.deleteDocument(bcpDesignDocName);
    };
