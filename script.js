// BLE code originally from https://randomnerdtutorials.com/esp32-web-bluetooth/

// BLE specs
const deviceName = 'ESP32';
const bleService = 0x04D2;
const primaryColorStartingCharacteristic = '00000001-0000-1000-8000-00805f9b34fb';
const primaryColorEndingCharacteristic = '00000002-0000-1000-8000-00805f9b34fb';
const secondaryColorStartingCharacteristic = '00000004-0000-1000-8000-00805f9b34fb';
const secondaryColorEndingCharacteristic = '00000005-0000-1000-8000-00805f9b34fb';
const primarySpeedCharacteristic = '00000003-0000-1000-8000-00805f9b34fb';
const secondarySpeedCharacteristic = '00000006-0000-1000-8000-00805f9b34fb';
const protocolCharacteristic = '00000007-0000-1000-8000-00805f9b34fb';

const characteristicList = [primaryColorStartingCharacteristic, primaryColorEndingCharacteristic, primarySpeedCharacteristic, secondaryColorStartingCharacteristic, secondaryColorEndingCharacteristic, secondarySpeedCharacteristic, protocolCharacteristic];
var _characteristics = [];

// Global variables
var bleServer;
var bleServiceFound;
var characteristicFound;
var connectButton;
var disconnectButton;

// Attach event handlers once page is loaded
window.onload = function() {
    connectButton = document.getElementById('connectBleButton');
    disconnectButton = document.getElementById('disconnectBleButton');

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
        // filters: [{name: deviceName}],
        // optionalServices: [bleService]
        acceptAllDevices: true,
        optionalServices: [bleService]
    })
    .then(device => {
        console.log('Device Selected: ', device.name);
        bleStateContainer.innerHTML = 'Connected to device ' + device.name;
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
        
        // characteristicList.forEach(function(sensorCharacteristic, index) {
        //     // var temp = await service.getCharacteristic(sensorCharacteristic);
        //     var temp = service.getCharacteristic(sensorCharacteristic);
        //     _characteristics.push(temp);
        // })
        for (let i = 0; i < characteristicList.length; i++) {
            var temp = await service.getCharacteristic(characteristicList[i]);
             _characteristics.push(temp);
        }
        return _characteristics;
    })
    // .then(characteristic => {
    //     console.log("Characteristic discovered:", characteristic.uuid);
    //     sensorCharacteristicFound = characteristic;
    //     characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
    //     characteristic.startNotifications();
    //     console.log("Notifications Started.");
    //     return characteristic.readValue();
    // })
    .then(_characteristics => {
        for (let i = 0; i < _characteristics.length; i++) {
            var characteristic = _characteristics[i];
            console.log("Characteristic discovered:", characteristic.uuid);
            characteristicFound = characteristic;
            characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
            characteristic.startNotifications();
            console.log("Notifications Started.");
        }
    })
    // // .then(value => {
    //     console.log("Read value: ", value);
    //     const decodedValue = new TextDecoder().decode(value);
    //     console.log("Decoded value: ", decodedValue);
    //     retrievedValue.innerHTML = decodedValue;
    // })
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
    const newValueReceived = new TextDecoder().decode(event.target.value);
    console.log("Characteristic value changed: ", newValueReceived);
    retrievedValue.innerHTML = newValueReceived;
    timestampContainer.innerHTML = getDateTime();
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
        .then(() => {
            latestValueSent.innerHTML = value;
            console.log("Value written to characteristic:", value);
        })
        .catch(error => {
            console.error("Error writing to the characteristic: ", error);
        });
    } else {
        console.error ("Bluetooth is not connected. Cannot write to characteristic.")
        window.alert("Bluetooth is not connected. Cannot write to characteristic. \n Connect to BLE first!")
    }
}

// Send data over BLE when the form is updated
function updateFields(event, param) {

    // Retrieve new data
    let source = document.getElementById(param)
    let startingColor = source.querySelector('input[name="starting"').value
    let endingColor = source.querySelector('input[name="ending"').value
    let speed = source.querySelector('input.speedSelector').value

    // Debug
    window.alert(param + ', ' + startingColor + ", " + endingColor + ', ' + speed)

    // Send over BLE
    if (param == "primary") {
        writeOnCharacteristic(primaryColorStartingCharacteristic, startingColor);
        writeOnCharacteristic(primaryColorEndingCharacteristic, endingColor);
        writeOnCharacteristic(primarySpeedCharacteristic, speed);
    }
    else {
        writeOnCharacteristic(secondaryColorStartingCharacteristic, startingColor);
        writeOnCharacteristic(secondaryColorEndingCharacteristic, endingColor);
        writeOnCharacteristic(secondarySpeedCharacteristic, speed);
    }

    // Prevent form from being cleared
    event.preventDefault();
}

