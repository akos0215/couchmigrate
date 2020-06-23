import { createLogger } from 'winston';
import * as chai from 'chai';

import { DBSettings } from '../src/model';
import { updateDesignDocument } from '../src/DesignDocUpdater';

import { CouchDBClient } from './../src/CouchdbClient';

describe('test migration API endpoint - trivial tests', () => {

  it('test', async () => {

    // TODO set up local Cloudant Docker Image
    const logger = createLogger();
    const settings: DBSettings = {
      dbURL: 'http://localhost:8080',
      dbName: 'test_designdoc',
      designDoc: {},
      dbHost: 'localhost',
      dbPassword: 'pass',
      dbUsername: 'admin',
    };
    const dbClient = new CouchDBClient(settings, logger);

    chai.assert.isNotNull(dbClient);
  });

  it.only('test', async () => {

    // TODO set up local Cloudant Docker Image
    const logger = createLogger();
    const settings: DBSettings = {
      // dbURL: 'http://localhost:8080',
      dbName: 'test_designdoc',
      designDoc: {},
      dbHost: 'localhost:8080',
      dbPassword: 'pass',
      dbUsername: 'admin',
    };
    // tslint:disable-next-line: no-require-imports
    const result = await updateDesignDocument(settings, '_design/app', require('./data/test_designDoc.json'));
    chai.assert.isNotNull(result);
  });
});
