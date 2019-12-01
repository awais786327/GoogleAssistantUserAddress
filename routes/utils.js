let db = '';

const utils = {
  saveData: saveData
};

function saveData(key, value) {
  return new Promise((resolve, reject) => {
    db.findOne(opt, function(err, doc) {
      if (err) {
        reject(err)
      } else {
        resolve(doc)
      }
    });
  });
}

module.exports = utils;
