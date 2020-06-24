import * as Nano from 'nano';
import { createLogger, format, Logger, transports } from 'winston';

import { DBSettings } from './model';

export class CouchDBClient {

  db: any;
  nano: any;
  logger: Logger;

  constructor(dbSettings: DBSettings, logger: Logger) {
    this.logger = logger;

    const url = (dbSettings.dbURL) ?
      `${dbSettings.dbURL}/${dbSettings.dbName}` :
      dbSettings.dbHost.startsWith('localhost') ?
      `http://${dbSettings.dbUsername}:${dbSettings.dbPassword}@${dbSettings.dbHost}` :
      `https://${dbSettings.dbUsername}:${dbSettings.dbPassword}@${dbSettings.dbUsername}.${dbSettings.dbHost}`;

    // tslint:disable-next-line: no-require-imports
    this.nano = require('nano')({
      url,
      requestDefaults: {
        timeout: 10000,
        headers: {
          'User-Agent': 'couchmigrate',
          'x-cloudant-io-priority': 'low',
        },
      },
    });

    this.db = this.nano.use(dbSettings.dbName);

  }

  async copyDocument(sourceId: string, destinationId: string): Promise<void> {

    return this.db.copy(sourceId, destinationId, { overwrite: true });
  }

  async deleteDocument(docId: string): Promise<any> {
    const logger = createLogger();

    try {
      logger.log('## Delete Document - Looking for docid', docId); // do I need to get it?
      const doc = await this.db.get(docId);

      logger.log('## Delete Document - Deleting ', docId, doc._rev);

      return this.db.destroy(docId, doc._rev);

    } catch (error) {
        logger.error(`Error: ${error.message}`);
        throw error;
    }
  }

  async fetchDocument(documentId: string): Promise<any> {
    this.logger.log('## copydoc - Fetching doc ', documentId);

    return this.db.get(documentId);
  }

  async upsertDocument(document: any): Promise<void> {

    let storedDoc;
    try {
      storedDoc = await this.fetchDocument(document._id);
    } catch (e) {
      if (e.message === 'missing' || e.message === 'deleted')
        this.logger.log(`fetching doc ${document._id} failed. `, e);
      else throw e;
    }
    document._rev = storedDoc ? storedDoc._rev : undefined;

    return this.db.insert(document);
  }

  async view(docName: string, viewName: string, options: any): Promise<any> {
    return this.db.view(docName, viewName, options);
  }

  async search(docName: string, searchName: string, options: any): Promise<any> {
    return this.db.search(docName, searchName, options);
  }

  async request(options: any): Promise<any> {
    return this.nano.request(options);
  }
}
