export function createVoiceIngest({ input, speakButton, status, onFinal }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { speakButton.addEventListener("click", () => status("Speech unavailable — type into the dock.")); return; }
  const recognition = new Recognition();
  recognition.continuous = false; recognition.interimResults = true; recognition.lang = "en-US";
  recognition.onstart = () => { speakButton.textContent = "● LISTENING…"; status("LISTENING FOR REQUIREMENTS…"); };
  recognition.onresult = (event) => { let text = ""; for (let i = event.resultIndex; i < event.results.length; i += 1) text += event.results[i][0].transcript; input.value = text; };
  recognition.onend = () => { speakButton.textContent = "● SPEAK"; status("READY FOR REQUIREMENTS"); if (input.value.trim()) onFinal(); };
  recognition.onerror = () => { speakButton.textContent = "● SPEAK"; status("READY FOR REQUIREMENTS"); };
  speakButton.addEventListener("click", () => recognition.start());
}
