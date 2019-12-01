'use strict';

const express = require('express');
const router = express.Router();
const axios = require('axios');
const localStorage = require('local-storage');
const {dialogflow, Permission} = require('actions-on-google');

router.get('/', (req, res, next) => {
  res.send(`Server is up and running.`);
});

const app = dialogflow();
const getMaterialResponseAPI = 'https://gatewaywebservice.azurewebsites.net/gateway/getmaterialresponse';
const getAddressResponseAPI = 'https://gatewaywebservice.azurewebsites.net/gateway/getaddressresponse';

/*
interface UserStorage : {
  requestedPermissionType: String,
  material: String,
  address: String,
  location: {
    latitude: Number,
    longitude: Number,
  }
}
*/

function askForLocation(conv, material) {
  const permissionContext = `I can't assist you because i'dont have your location details therefore to assist you better about ${material} \ni'll need to locate you and for that`;
  const requestedPermissionType = conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT') ? 'DEVICE_PRECISE_LOCATION' : 'DEVICE_COARSE_LOCATION';
  const userStorage = localStorage('userStorage');
  userStorage['material'] = material;
  userStorage['requestedPermissionType'] = requestedPermissionType;
  localStorage('userStorage', userStorage);
  return conv.ask(new Permission({
    context: permissionContext,
    permissions: requestedPermissionType,
  }));
}

function getTypesOfThingsCanManageResponse(conv, paylaod) {
  console.log(`paylaod = `, paylaod, `\n`);
  return axios.post(getAddressResponseAPI, paylaod)
    .then(response => {
      console.log(`response : `, response.data, `\n`);
      let reply = response.data.text + '\n\n' + 'Would you like to ask anything ?';
      return conv.ask(reply);
    })
    .catch(error => {
      console.log(`error : `, error.response.statusText, `\n`);
      return conv.close(`I'm not feeling better today so please ask me later`);
    });
}

app.intent('Types Of Things Can Manage', (conv, {material, date}) => {
  console.log(`\nIntent :: Types Of Things Can Manage\n`);
  const userStorage = localStorage('userStorage');

  if(date) {
    userStorage['date'] = date;
    localStorage('userStorage', userStorage);
  }

  if (!(userStorage && userStorage.address)) {
    return askForLocation(conv, material);
  }

  const paylaod = {date: (date || null), material: material, location: userStorage.location, address: userStorage.address};
  return getTypesOfThingsCanManageResponse(conv, paylaod);
});

app.intent('How To Manage Things', (conv, {material}) => {
  console.log(`\nIntent :: How To Manage Things\n`);

  const paylaod = {material: material};
  console.log(`paylaod : `, paylaod, `\n`);

  return axios.post(getMaterialResponseAPI, paylaod)
    .then(response => {
      console.log(`response : `, response.data, `\n`);
      let reply = response.data.text + '\n\n' + 'Would you like to ask anything ?';
      return conv.ask(reply);
    })
    .catch(error => {
      console.log(`error : `, error.response.statusText, `\n`);
      return conv.close(`I'm not feeling better today so please ask me later`);
    });
});

app.intent('Location Permission Granted', (conv, params, permissionGranted) => {
  if (!permissionGranted) {
    return conv.close(`Sorry Permission Denied So i can't help anymore`);
  }

  const userStorage = localStorage('userStorage');

  const {city, coordinates, formattedAddress} = conv.device.location;

  if (userStorage.requestedPermissionType === 'DEVICE_COARSE_LOCATION') {
    userStorage['address'] = formattedAddress || 'Address';
    userStorage['location'] = city;
  }

  if (userStorage.requestedPermissionType === 'DEVICE_PRECISE_LOCATION') {
    userStorage['address'] = formattedAddress || 'Address';
    userStorage['location'] = {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };
  }

  localStorage('userStorage', userStorage);

  conv.ask(`Thanks! Now i have your details stored with me`);

  const paylaod = {date: userStorage.date || null, material: userStorage.material, location: userStorage.location, address: userStorage.address};
  return getTypesOfThingsCanManageResponse(conv, paylaod);
});

app.intent('Clear Storage', (conv) => {
  localStorage.clear();
  console.log('\n----------------------- Storage Cleared -----------------------\n');
  localStorage('userStorage', {});
  return conv.close(`All clear`);
});

router.post('/webhook', app);

module.exports = router;
