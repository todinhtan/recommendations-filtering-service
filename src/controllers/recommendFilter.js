/* eslint-disable max-len */
import { MongoClient } from 'mongodb';
import logger from '../utils/logger';
import config from '../config';
import dateUtils from '../utils/date';

// filter and update
export default async function post(req, res) {
  // connect mongodb
  const connection = await MongoClient.connect(config.database.uri, { useNewUrlParser: true })
    .catch(err => logger.error(err));
  // throw http 500 if connect failed
  if (!connection) return res.status(500).end();

  try {
    const collection = connection.db().collection(config.collectionName);

    // get array of requested identifiers
    const vendorItemIdentifiers = req.body.recommendations.map(rec => rec.vendorItemIdentifier);

    const { ownerId, userHashId } = req.body;
    // find corresponding items
    const recommendedItems = await collection.find({ ownerId, userHashId, itemId: { $in: vendorItemIdentifiers } }).toArray().catch(err => logger.error(err));

    const { days, resetPeriod } = config.noUserActOn;
    const daysInMiliseconds = dateUtils.getDaysInMiliseconds(days);
    const resetPeriodInMiliseconds = dateUtils.getDaysInMiliseconds(resetPeriod);
    const currTimestamp = Date.now();

    // process requested recommendations asynchronously
    const toRemoveIds = [];
    await Promise.all(recommendedItems.map(async (item) => {
      const diffBetweenLastTouch = currTimestamp - item.timestamp;
      if (diffBetweenLastTouch > daysInMiliseconds && diffBetweenLastTouch < (daysInMiliseconds + resetPeriodInMiliseconds)) {
        toRemoveIds.push(item.itemId);
        req.body.recommendations = req.body.recommendations.filter(rec => rec.vendorItemIdentifier !== item.itemId);
      } else if (diffBetweenLastTouch >= (daysInMiliseconds + resetPeriodInMiliseconds)) {
        const { itemId } = item;
        await collection.findOneAndUpdate({ ownerId, userHashId, itemId }, { $set: { timestamp: currTimestamp } }).catch(err => logger.error(err));
      }
    }));

    // close connection to db
    connection.close();

    // remove unusual recommends
    req.body.recommendations = req.body.recommendations.filter(rec => !toRemoveIds.includes(rec.vendorItemIdentifier));

    return res.json(req.body).end();
  } catch (error) {
    logger.error(error);
    return res.status(500).end();
  }
}
