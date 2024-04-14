let port;
let thickness = 5
let readerWork = true
let reader;
let lastClickTime = 0;

async function connectButton() {
    try {
        console.log('in Connect');
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        document.querySelectorAll('button').forEach(button => {
            button.disabled = false;
        });

        document.getElementById('connectButton').disabled = true;

        readLoop();

    } catch (error) {
        console.error('Failed to open serial port:', error);
    }
};

async function disconnectButton() {
    console.log('in disConnect');

    try {
        if (port && port.readable) {
            try {
                readerWork = false;
                await reader.cancel();
            } catch (error) {
                console.log("disconnect error: ", error)
            }
            await port.close();
        }

        document.querySelectorAll('.sendButton').forEach(button => {
            button.disabled = true;
        });

        document.getElementById('connectButton').disabled = false;

    } catch (error) {
        console.error('Failed to close serial port:', error);
    }

};

async function readLoop() {
    try {
        let receivedData = '';

        while (port && port.readable && readerWork) {
            reader = port.readable.getReader();
            try {

                while (readerWork) {

                    const { value, done } = await reader.read();

                    if (done) { break; }

                    receivedData += new TextDecoder().decode(value, { stream: true }); // Use stream option to handle large amounts of data
                    const lines = receivedData.split('\n');
                    console.log("lines: ", lines);


                    for (let i = 0; i < lines.length - 1; i++) {
                        try {
                            const line = lines[i];
                            console.log(">line>> " + line)

                            if (/^p:([0-9]{1,4}).*/.test(line)) {

                                 // Split the string into parts based on '/'
                                let parts = line.split('/');
    
                                // Extract the integers from the parts
                                const progress = parseInt(parts[0].split(':')[1], 10);
                                const totel = parseInt(parts[1], 10); 

                                handleProgress(progress, totel);

                                //const progress = parseInt(line.match(/^p:([0-9]{1,4}).*/)[1]);
                                //console.log(">>> " + progress)
                                //handleProgress(progress, 10);
                            } else {
                                const jsonData = JSON.parse(line);
                                console.log("JSON data:", jsonData);

                                // Process the JSON data here
                                // For example, extract values from the JSON object
                                const { rgb, sensativity, tg, num_of_sample } = jsonData;
                                console.log("RGB:", rgb, "Sensativity:", sensativity, "TG:", tg, "Number of Samples:", num_of_sample);


                                document.getElementById("result_red").textContent = JSON.stringify(rgb.r);
                                document.getElementById("result_green").textContent = JSON.stringify(rgb.g);
                                document.getElementById("result_blue").textContent = JSON.stringify(rgb.b);
                                document.getElementById("result").textContent = JSON.stringify(jsonData);
                            }
                        } catch (error) {
                            console.error('Error parsing JSON:', error);
                        }
                    }

                    /*
                    for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i];
                        const [t, r, g, b] = line.split(',').map(Number);
                        console.log("Timestamp:", t, "R:", r, "G:", g, "B:", b);
                        const time = t// new Date(t);
                        addDataPoint(time, r, g, b, thickness);
                    }
                    */

                    // Keep the incomplete line for the next iteration
                    receivedData = lines[lines.length - 1];
                }

            } finally {
                reader.releaseLock();
            }
        }
    } catch (error) {
        console.error('Error reading from serial port:', error);
    }
}


document.getElementById("whiteLed_button").addEventListener("click", function () {
    event.preventDefault();
    this.classList.toggle("on");
    this.classList.toggle("off");
    this.textContent = this.classList.contains("on") ? "White LED's OFF" : "White LED's ON";
});

document.getElementById("blueLed_button").addEventListener("click", function () {
    event.preventDefault();
    this.classList.toggle("on");
    this.classList.toggle("off");
    this.textContent = this.classList.contains("on") ? "Blue LED's OFF" : "Blue LED's ON";
});

document.getElementById("sensativity_button").addEventListener("click", function () {
    event.preventDefault();
    this.classList.toggle("HIGH");
    this.classList.toggle("LOW");
    this.textContent = this.classList.contains("HIGH") ? "LOW" : "HIGH";
});


async function send_Integration_Time() {
    const value = document.getElementById('Integration_Input').value;
    console.log("value " + value);
    send(7, value);
}


async function send(message) {
    try {
        if (!port || !port.writable) { throw new Error('Serial port not open'); }

        const writer = port.writable.getWriter();
        writer.write(new TextEncoder().encode(message));
        writer.releaseLock();
    } catch (error) {
        console.error('Failed to write to serial port:', error);
    }
}

  
//-------- result copy ---------

function copyText() {
    var text = document.querySelector('.result_container p').innerText;
    navigator.clipboard.writeText(text).then(function () {
        console.log('Text copied to clipboard');
        var icon = document.querySelector('.material-symbols-outlined');
        icon.innerText = 'done'; // Replace with "done" icon
        icon.style.color = 'green'; // Set color to green
        lastClickTime = Date.now();
        setTimeout(function () {
            icon.innerText = 'content_copy'; // Restore "copy" icon
            icon.style.color = '#333'; // Restore color
        }, 5000); // Reset after 5 seconds
    }, function (err) {
        console.error('Could not copy text: ', err);
    });
}


function handle_mouseover() {
    var icon = document.querySelector('.material-symbols-outlined');
    if (Date.now() - lastClickTime < 5000) { return; }
    icon.style.color = 'blue';
}


function handle_mouseout() {
    var icon = document.querySelector('.material-symbols-outlined');
    if (Date.now() - lastClickTime < 5000) { return; }
    icon.style.color = '#333';
}

//----------------------------


document.getElementById("startTestButton").addEventListener("click", function () {
    event.preventDefault();

    // Serialize form data to JSON
    const formData = new FormData(document.getElementById("controlForm"));
    const json = {};

    // Add state of whiteLed_button to JSON
    const whiteLedButton = document.getElementById("whiteLed_button");
    const isWhiteLedOn = whiteLedButton.classList.contains("on");
    json["whiteLeds"] = isWhiteLedOn ? 0 : 1;

    // Add state of blueLed_button to JSON
    const blueLedButton = document.getElementById("blueLed_button");
    const isBlueLedOn = blueLedButton.classList.contains("on");
    json["blueLeds"] = isBlueLedOn ? 0 : 1;

    // Add state of sensativity_button to JSON
    const sensativityButton = document.getElementById("sensativity_button");
    const isHighSensativity = sensativityButton.classList.contains("HIGH");
    json["sensativity"] = isHighSensativity ? "LOW" : "HIGH";


    json["tg"] = parseInt(document.getElementById("Integration_Input").value);
    json["num_of_sample"] = parseInt(document.getElementById("numOfSamples_Input").value);

    const jsonString = JSON.stringify(json);
    // Assuming you have a function sendJsonOverSerial(jsonString) to send the JSON over serial
    console.log(jsonString)
    console.log("--------")
    send(jsonString);


    startProgressBar();

});


//-----------------------------------------------------------


function startProgressBar() {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.display = 'flex';
    progress = 0;
    updateProgressBar();
}

function closeProgressBar() {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.display = 'none';
}

function handleProgress(data, total) {
    const progressBar = document.getElementById('progress');
    progressBar.value = (data / total) * 100;
    if (data + 1 >= total) {
        closeProgressBar();
    }
}


