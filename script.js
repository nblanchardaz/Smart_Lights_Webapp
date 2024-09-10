// BLE code originally from https://randomnerdtutorials.com/esp32-web-bluetooth/

// BLE specs
const deviceName = 'LED CONTROLLER';
const bleService = 0x04D2;
const primaryColorStartingCharacteristic = '00000001-0000-1000-8000-00805f9b34fb';
const primaryColorEndingCharacteristic = '00000002-0000-1000-8000-00805f9b34fb';
const secondaryColorStartingCharacteristic = '00000004-0000-1000-8000-00805f9b34fb';
const secondaryColorEndingCharacteristic = '00000005-0000-1000-8000-00805f9b34fb';
const primarySpeedCharacteristic = '00000003-0000-1000-8000-00805f9b34fb';
const secondarySpeedCharacteristic = '00000006-0000-1000-8000-00805f9b34fb';
const primarySensitivityCharacteristic = '00000009-0000-1000-8000-00805f9b34fb';
const primaryNoiseFloorCharacteristic = '0000000b-0000-1000-8000-00805f9b34fb';
const protocolCharacteristic = '00000007-0000-1000-8000-00805f9b34fb';
const updateFlagCharacteristic = '00000008-0000-1000-8000-00805f9b34fb';
const firmwareVersionCharacteristic = '0000000a-0000-1000-8000-00805f9b34fb';
const modeCharacteristic = '0000000c-0000-1000-8000-00805f9b34fb';
const numLedsCharacteristic = '0000000d-0000-1000-8000-00805f9b34fb';

const characteristicList = [primaryColorStartingCharacteristic, primaryColorEndingCharacteristic, primarySpeedCharacteristic, primarySensitivityCharacteristic, primaryNoiseFloorCharacteristic, secondaryColorStartingCharacteristic, secondaryColorEndingCharacteristic, secondarySpeedCharacteristic, protocolCharacteristic, updateFlagCharacteristic, modeCharacteristic, numLedsCharacteristic, firmwareVersionCharacteristic];
var _characteristics = [];

// Global variables
var bleServer;
var bleServiceFound;
var characteristicFound;
var connectButton;
var disconnectButton;
var firmwareField;

// Attach event handlers once page is loaded
window.onload = function() {
    connectButton = document.getElementById('connectBleButton');
    disconnectButton = document.getElementById('disconnectBleButton');
    firmwareField = document.getElementById('firmwareVersion');

    connectButton.addEventListener('click', (event) => {
        if (isWebBluetoothEnabled()) {
            connectToDevice();
        }
    });

    disconnectButton.addEventListener('click', disconnectDevice);
}

// BLE Functions
function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log("Web Bluetooth API is not available in this browser!");
        bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser!";
        return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
}

function connectToDevice() {
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        filters: [{name: deviceName}],
        optionalServices: [bleService]
        // acceptAllDevices: true,
        // optionalServices: [bleService]
    })
    .then(device => {
        console.log('Device Selected: ', device.name);
        // bleStateContainer.innerHTML = 'Connected to device ' + device.name;
        bleStateContainer.innerHTML = 'Connected';
        bleStateContainer.style.color = "#24af37";
        device.addEventListener('gattservicedisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(gattServer => {
        bleServer = gattServer;
        console.log("Connected to GATT Server");
        return bleServer.getPrimaryService(bleService);
    })
    .then(async service => {
        bleServiceFound = service;
        console.log("Service discoverd:", service.uuid);
        
        for (let i = 0; i < characteristicList.length; i++) {
            var temp = await service.getCharacteristic(characteristicList[i]);
             _characteristics.push(temp);
        }
        return _characteristics;
    })
    .then(_characteristics => {
        var characteristic;
        for (let i = 0; i < _characteristics.length; i++) {
            characteristic = _characteristics[i];
            console.log("Characteristic discovered:", characteristic.uuid);
            characteristicFound = characteristic;
            characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
            characteristic.startNotifications();
            console.log("Notifications Started.");
        }
        return characteristic;
    })
    .then(async _characteristic => {
        _value = await _characteristic.readValue();
        const decodedValue = new TextDecoder().decode(_value);
        firmwareField.innerHTML = "Firmware Build " + decodedValue;
    })
    .catch(error => {
        console.log('Error: ', error);
    })
}

function onDisconnected(event){
    console.log('Device Disconnected:', event.target.device.name);
    bleStateContainer.innerHTML = "Device disconnected";
    bleStateContainer.style.color = "#d13a30";

    connectToDevice();
}

function handleCharacteristicChange(event){
    // const newValueReceived = new TextDecoder().decode(event.target.value);
    // console.log("Characteristic value changed: ", newValueReceived);
    // retrievedValue.innerHTML = newValueReceived;
    // timestampContainer.innerHTML = getDateTime();
}

function disconnectDevice() {
    console.log("Disconnect Device.");
    if (bleServer && bleServer.connected) {
        if (characteristicFound) {
            characteristicFound.stopNotifications()
                .then(() => {
                    console.log("Notifications Stopped");
                    return bleServer.disconnect();
                })
                .then(() => {
                    console.log("Device Disconnected");
                    bleStateContainer.innerHTML = "Device Disconnected";
                    bleStateContainer.style.color = "#d13a30";

                })
                .catch(error => {
                    console.log("An error occurred:", error);
                });
        } else {
            console.log("No characteristic found to disconnect.");
        }
    } else {
        // Throw an error if Bluetooth is not connected
        console.error("Bluetooth is not connected.");
        window.alert("Bluetooth is not connected.")
    }
}

function getDateTime() {
    var currentdate = new Date();
    var day = ("00" + currentdate.getDate()).slice(-2); // Convert day to string and slice
    var month = ("00" + (currentdate.getMonth() + 1)).slice(-2);
    var year = currentdate.getFullYear();
    var hours = ("00" + currentdate.getHours()).slice(-2);
    var minutes = ("00" + currentdate.getMinutes()).slice(-2);
    var seconds = ("00" + currentdate.getSeconds()).slice(-2);

    var datetime = day + "/" + month + "/" + year + " at " + hours + ":" + minutes + ":" + seconds;
    return datetime;
}

function writeOnCharacteristic(_characteristic, value){
    if (bleServer && bleServer.connected) {
        bleServiceFound.getCharacteristic(_characteristic)
        .then(characteristic => {
            console.log("Found the characteristic: ", characteristic.uuid);
            const data = new Uint8Array([value]);
            return characteristic.writeValue(data);
        })
        // .then(() => {
        //     latestValueSent.innerHTML = value;
        //     console.log("Value written to characteristic:", value);
        // })
        .catch(error => {
            console.error("Error writing to the characteristic: ", error);
        });
    } else {
        console.error ("Bluetooth is not connected. Cannot write to characteristic.")
        // window.alert("Bluetooth is not connected.\nConnect to device first!")
    }
}

function writeArrayOnCharacteristic(_characteristic, arr){
    if (bleServer && bleServer.connected) {
        bleServiceFound.getCharacteristic(_characteristic)
        .then(characteristic => {
            console.log("Found the characteristic: ", characteristic.uuid);
            return characteristic.writeValue(arr);
        })
        // .then(() => {
        //     latestValueSent.innerHTML = value;
        //     console.log("Value written to characteristic:", value);
        // })
        .catch(error => {
            console.error("Error writing to the characteristic: ", error);
        });
    } else {
        console.error ("Bluetooth is not connected. Cannot write to characteristic.")
        // window.alert("Bluetooth is not connected.\nConnect to device first!")
    }
}

function hexToByteArray(hex) {

    // First, remove '#'
    hex = hex.slice(1);

    // Next, get red, green, and blue values
    let red = parseInt(hex.slice(0, 2), 16);
    let green = parseInt(hex.slice(2, 4), 16);
    let blue = parseInt(hex.slice(4), 16);

    // Re-create our number by splicing the three bytes together
    let buffer = new Uint8Array(3);
    buffer[0] = red;
    buffer[1] = green;
    buffer[2] = blue;

    // // Turns out we didn't really need an array... because we have to join the three values anyways. But I'll leave it here because it could be useful if I find a better method in the future.
    // let final = (buffer[0] << 16) | (buffer[1] << 8) | buffer[2];
    
    // return final;
    return buffer;
}

// Send data over BLE when the form is updated
function updateFields(event, param) {

    let source = document.getElementById(param)

    // // Retrieve new data
    if (param == "protocol") {
        // If it's the protocol form, we only need the protocol.
        let protocol = source.querySelector('select.protocolSelector').value
        writeOnCharacteristic(protocolCharacteristic, protocol);
    }
    else if (param == "mode") {
        let mode = source.querySelector('select.modeSelector').value
        writeOnCharacteristic(modeCharacteristic, mode);
    }
    else if (param == "numLeds") {
        let numLeds = source.querySelector('select.numLedsSelector').value
        writeOnCharacteristic(numLedsCharacteristic, numLeds);
    }
    else if (param == "primary") {
        // If it's the primary form, we need color, speed, sensitity, and noise floor data.
        let startingColor = source.querySelector('input[name="starting"').value
        let endingColor = source.querySelector('input[name="ending"').value
        let speed = source.querySelector('input.speedSelector').value
        let sensitivity = source.querySelector('input.sensitivitySelector').value
        let noiseFloor = source.querySelector('input.noiseFloorSelector').value;

        // Translate color values
        let startingColorTranslated = hexToByteArray(startingColor);
        let endingColorTranslated = hexToByteArray(endingColor);

        writeArrayOnCharacteristic(primaryColorStartingCharacteristic, startingColorTranslated);
        writeArrayOnCharacteristic(primaryColorEndingCharacteristic, endingColorTranslated);
        writeOnCharacteristic(primarySpeedCharacteristic, speed);
        writeOnCharacteristic(primarySensitivityCharacteristic, sensitivity);
        writeOnCharacteristic(primaryNoiseFloorCharacteristic, noiseFloor);
    }
    else if (param == "secondary") {
        // If it's the secondary form, we need color and speed data.
        let startingColor = source.querySelector('input[name="starting"').value
        let endingColor = source.querySelector('input[name="ending"').value
        let speed = source.querySelector('input.speedSelector').value

        // Translate color values
        let startingColorTranslated = hexToByteArray(startingColor);
        let endingColorTranslated = hexToByteArray(endingColor);
        
        writeArrayOnCharacteristic(secondaryColorStartingCharacteristic, startingColorTranslated);
        writeArrayOnCharacteristic(secondaryColorEndingCharacteristic, endingColorTranslated);
        writeOnCharacteristic(secondarySpeedCharacteristic, speed);
    }


    // Update flag
    writeOnCharacteristic(updateFlagCharacteristic, 1);

    // Prevent form from being cleared
    event.preventDefault();
}