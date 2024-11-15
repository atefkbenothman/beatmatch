let BPM_DECK_1 = 120
let BPM_DECK_2 = BPM_DECK_1
let PREV_BPM_DECK_2 = BPM_DECK_2
let DECK_1_STARTED = false
let DECK_2_STARTED = false

document.getElementById("bpm").innerText = `BPM: ${BPM_DECK_1}`
document.getElementById("startButton").addEventListener("click", startDeck1)
document.getElementById("stopButton").addEventListener("click", stopDecks)
document.getElementById("bpmSlider").addEventListener("input", (event) => {
  BPM_DECK_1 = event.target.value
  BPM_DECK_2 = event.target.value
  updateDeckBPM(1, BPM_DECK_1)
  updateDeckBPM(2, BPM_DECK_2)
  document.getElementById("bpm").innerText = `BPM: ${BPM_DECK_1}`;
})
document.getElementById("soundSelector").addEventListener("change", (event) => {
  const selectedSound = event.target.value;
  document.getElementById("beat").src = selectedSound;
});
window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    startDeck2()
  }
})

WebMidi
  .enable()
  .then(onEnabled)
  .catch(err => console.error(err))

function onEnabled() {
  if (WebMidi.inputs.length < 1) {
    document.getElementById("statusMessage").innerText = "no device connected"
    return
  }
  WebMidi.inputs.forEach((device, idx) => {
    document.getElementById("statusMessage").innerText = `connected: ${device.name}`
  })
  const cdj = WebMidi.inputs[0]
  cdj.channels[1].addListener("midimessage", m => {
    const msg = midiMessageToData(m.data)
    if (msg.type === "noteon") {
    } else if (msg.type === "controlchange" && msg.controller === 48) {
      const velocity = msg.value - 64
      handleJogWheel(velocity, BPM_DECK_2)
    }
  })
}

function handleJogWheel(velocity, originalBPM) {
  if (!DECK_1_STARTED || !DECK_2_STARTED) {
    return
  }
  const sensitivity = 0.5
  let newBPM = originalBPM + (velocity * sensitivity)

  if (velocity > 0) {
    if (newBPM > PREV_BPM_DECK_2) {
      PREV_BPM_DECK_2 = newBPM
    } else {
      newBPM = PREV_BPM_DECK_2
    }
  } else {
    if (newBPM < PREV_BPM_DECK_2) {
      PREV_BPM_DECK_2 = newBPM
    } else {
      newBPM = PREV_BPM_DECK_2
    }
  }

  updateDeckBPM(2, newBPM);
}

function startDeck1() {
  if (DECK_1_STARTED) {
    return
  }
  DECK_1_STARTED = true
  document.getElementById("startButton").classList.add("hidden")
  document.getElementById("stopButton").classList.remove("hidden")
  playDeck(1)
}

function startDeck2() {
  if (!DECK_1_STARTED || DECK_2_STARTED) {
    return
  }
  DECK_2_STARTED = true
  playDeck(2)
}

function playBeat(deck) {
  const beats = document.querySelectorAll(`div.moving-line-left[deck="${deck}"]`)
  Array.from(beats).forEach(beat => {
    beat.addEventListener("animationiteration", () => {
      playSound()
    })
  })
}

function playSound() {
  const beatSound = document.getElementById("beat")
  beatSound.currentTime = 0
  beatSound.play()
}

function updateDeckBPM(deck, newBPM) {
  let beatGrid
  if (deck === 1) {
    beatGrid = document.getElementById("beatGridDeck1")
  } else {
    beatGrid = document.getElementById("beatGridDeck2")
  }
  const beatInterval = getBeatInterval(newBPM)
  const animationDuration = (beatInterval / 1000) * 4
  const animationDelays = [0, 1, 2, 3].map(multiplier => (beatInterval / 1000) * multiplier)
  Array.from(beatGrid.children).forEach(line => {
    if (line.classList.contains("moving-line-left") || line.classList.contains("moving-line-right")) {
      const idx = Number(line.getAttribute("idx"))
      line.style.animationDuration = `${animationDuration}s`;
      line.style.animationDelay = `${animationDelays[idx]}s`;
    }
  })
}

function playDeck(deck) {
  let beatGrid
  let beatInterval
  if (deck === 1) {
    beatGrid = document.getElementById("beatGridDeck1")
    beatInterval = getBeatInterval(BPM_DECK_1)
  } else {
    beatGrid = document.getElementById("beatGridDeck2")
    beatInterval = getBeatInterval(BPM_DECK_2)
  }
  const animationDuration = (beatInterval / 1000) * 4
  const animationDelays = [0, 1, 2, 3].map(multiplier => (beatInterval / 1000) * multiplier)
  animationDelays.map((delay, idx) => {
    const beatLineLeft = document.createElement("div")
    const beatLineRight = document.createElement("div")
    beatLineRight.addEventListener("animationstart", () => {
      playSound()
    })
    beatLineRight.addEventListener("animationiteration", () => {
      playSound()
    })
    beatLineLeft.classList.add("moving-line-left")
    beatLineRight.classList.add("moving-line-right")
    beatLineLeft.setAttribute("idx", idx)
    beatLineRight.setAttribute("idx", idx)
    beatLineLeft.setAttribute("deck", deck)
    beatLineRight.setAttribute("deck", deck)
    if (delay === 0) {
      beatLineLeft.style.backgroundColor = "red"
      beatLineRight.style.backgroundColor = "red"
    }
    beatLineLeft.style.animationDuration = `${animationDuration}s`
    beatLineRight.style.animationDuration = `${animationDuration}s`
    beatLineLeft.style.animationDelay = `${delay}s`
    beatLineRight.style.animationDelay = `${delay}s`
    beatGrid.appendChild(beatLineLeft)
    beatGrid.appendChild(beatLineRight)
  })
}

function stopBeatGrid(deck) {
  let beatGridDeck
  if (deck === 1) {
    beatGridDeck = document.getElementById("beatGridDeck1")
  } else {
    beatGridDeck = document.getElementById("beatGridDeck2")
  }
  const children = Array.from(beatGridDeck.children)
  children.forEach(child => {
    if (child.className === "moving-line-left" || child.className === "moving-line-right") {
      beatGridDeck.removeChild(child)
    }
  })
}

function getBeatInterval(bpm) {
  return (60 / bpm) * 1000
}

function stopDecks() {
  document.getElementById("bpmSlider").classList.remove("hidden")
  document.getElementById("startButton").classList.remove("hidden")
  document.getElementById("stopButton").classList.add("hidden")

  stopBeatGrid(1)
  stopBeatGrid(2)

  DECK_1_STARTED = false
  DECK_2_STARTED = false
}

const midiMessageTypes = {
  0x80: { type: 'noteoff', fields: ['note', 'velocity'] },
  0x90: { type: 'noteon', fields: ['note', 'velocity'] },
  0xA0: { type: 'polyphonickeypressure', fields: ['note', 'pressure'] },
  0xB0: { type: 'controlchange', fields: ['controller', 'value'] },
  0xC0: { type: 'programchange', fields: ['program'] },
  0xD0: { type: 'channelpressure', fields: ['pressure'] },
  0xE0: { type: 'pitchbendchange', fields: ['value'] }
}

function midiMessageToData(message) {
  // Each MIDI message has at least one byte, the status byte
  const statusByte = message[0]
  const dataByte1 = message[1] || 0
  const dataByte2 = message[2] || 0

  // Determine the type of message based on the high nibble of the status byte
  const messageType = statusByte & 0xF0
  const channel = statusByte & 0x0F

  const typeInfo = midiMessageTypes[messageType]

  // Default to an unknown message if typeInfo is not defined
  if (!typeInfo) {
    return { type: 'Unknown', channel: channel + 1 }
  }

  // Create the result based on the typeInfo mapping
  const result = { type: typeInfo.type, channel: channel + 1 }

  // Assign fields based on the fields array in typeInfo
  typeInfo.fields.forEach((field, index) => {
    if (field === 'value' && messageType === 0xE0) {
      // Special case for Pitch Bend Change, which combines two bytes
      result[field] = (dataByte2 << 7) | dataByte1
    } else {
      result[field] = index === 0 ? dataByte1 : dataByte2
    }
  })
  return result
}
