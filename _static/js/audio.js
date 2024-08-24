var jsPsychAudioSelection = (function (jspsych) {
  "use strict";

  const info = {
    name: "selection",
    parameters: {
      // Path to audio file to be played.
      // Jk! It's the name of the thing on the bespoke `AUDIO` object.
      stimulus: {
        // type: jspsych.ParameterType.AUDIO,
        type: jspsych.ParameterType.STRING,
        pretty_name: "Audio stimulus",
        default: undefined,
      },
      // (Optional) HTML prompt that appears above the choices.
      prompt: {
        type: jspsych.ParameterType.HTML_STRING,
        pretty_name: "HTML",
        default: null,
      },
      // Array containing the label(s) for the button(s).
      choices: {
        type: jspsych.ParameterType.STRING,
        pretty_name: "Choices",
        default: undefined,
        array: true,
      },
      // Array containing the value(s) for the button(s), if they should differ
      // from the labels passed to `choices`.
      data_choices: {
        type: jspsych.ParameterType.STRING,
        pretty_name: "Data choices",
        default: null,
        array: true,
      },
      // If set to true, then shuffle the choices (and the data choices,
      // if provided).
      shuffle: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: "Shuffle the choices",
        default: true,
      },
      // The correct response (if applicable).
      answer: {
        type: jspsych.ParameterType.STRING,
        pretty_name: "Correct answer",
        // default: undefined,
        default: null,
      },
      // The HTML for creating button. Can create own style. Use the
      // "%choice%" string to indicate where the label from the choices 
      // parameter should be inserted.
      button_html: {
        type: jspsych.ParameterType.HTML_STRING,
        pretty_name: "Button HTML",
        default: "<button class='jspsych-btn'>%choice%</button>",
        array: true,
      },
      // If set to true, then the subject must click the correct
      // response button after feedback in order to advance to next trial.
      force_correct_button_press: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: "Force correct button press",
        default: false,
      },
      // Whether to display the replay button as the first button in the button
      // group containing the choice buttons.
      display_replay_with_choices: {
        type: jspsych.ParameterType.BOOL,
        pretty_name: "Display replay button with choice buttons",
        default: false,
      },
      // How long to show the trial.
      trial_duration: {
        type: jspsych.ParameterType.INT,
        pretty_name: "Trial duration",
        default: null,
      },
      // How long to wait at first to play the audio. If no value is specified,
      // the audio will only play once the (re)play button is clicked.
      wait_to_play: {
        type: jspsych.ParameterType.INT,
        pretty_name: "Linger duration",
        default: null,
      },
      // How long to linger on the correct answer (in addition to trial
      // duration).
      linger_duration: {
        type: jspsych.ParameterType.INT,
        pretty_name: "Linger duration",
        default: null,
      },
    },
  };

  class AudioSelectionPlugin {
    constructor(jsPsych) {
      jsPsych = jsPsych;
    }
    async trial(display_element, trial, on_load = () => {}) {
      // display trial
      display_element.innerHTML = compose_display();
      // call on_load function
      on_load();
      // extract useful elements
      var replay = display_element.querySelector("#replay");
      var btns = display_element.querySelectorAll(".jspsych-selection-btn[data-choice]");
      var answer = display_element.querySelector(`[data-choice='${trial.answer}']`);
      // disable choice buttons until the audio has played through
      btns.forEach(btn => btn.querySelector("button").disabled = true);
      // // create audio context
      // var audio_context = jsPsych.pluginAPI.audioContext();
      // decode Base64 stimulus back into an ArrayBuffer
      var buffer = Base64Binary.decodeArrayBuffer(AUDIO[trial.stimulus]);
      // decode audio data using the Web Audio API
      AUDIO_CONTEXT.decodeAudioData(buffer, audioData => buffer = audioData);
      // load & play audio file
      var audio;
      play_audio();
      // gather the data to store for the trial
      var trial_data = {
        rt: null,
        stimulus: null,
        response: null,
      };
      // start time
      var start_time = performance.now();
      // add event listeners to choice buttons
      btns.forEach(
        div => div.addEventListener("click", process_response)
      );
      // function to enable choice buttons
      function enable_selection() {
        btns.forEach(btn => btn.querySelector("button").disabled = false);
      }
      // function to play audio using Web Audio API
      function play_audio() {
        try {
          // remove the onended event listener
          audio.removeEventListener("ended", enable_selection);
          // remove the previous replay event listener
          replay.removeEventListener("click", play_audio);
          // stop playing the audio if its already playing
          audio.stop();
        } catch {
          // the audio has yet to play
        }
        // play the audio after the delay specified by `trial.wait_to_play`
        if (trial.wait_to_play !== null) {
          jsPsych.pluginAPI.setTimeout(
            () => {
              // jsPsych.pluginAPI.getAudioBuffer(trial.stimulus)
              //   .then(buffer => {
              //     audio = audio_context.createBufferSource();
              //     audio.buffer = buffer;
              //     audio.connect(audio_context.destination);
              //     audio.start(audio_context.currentTime);
              //   });
              audio = AUDIO_CONTEXT.createBufferSource();
              audio.buffer = buffer;
              audio.connect(AUDIO_CONTEXT.destination);
              audio.start(AUDIO_CONTEXT.currentTime);
              // enable the choice buttons after the audio has played through
              audio.addEventListener("ended", enable_selection);
            }, trial.wait_to_play);
        }
        // set `trial.wait_to_play` to zero
        trial.wait_to_play = 0;
        // add an event listener to the choices that stops the audio once a
        // choice is selected
        btns.forEach(
          div => div.addEventListener("click", () => {
            audio.stop();
          })
        );
        // add a fresh event listener to the replay button
        replay.addEventListener("click", play_audio);
      }
      // function to compose `display_element` HTML
      function compose_display() {
        var trial_html = ``;
        // add standalone replay button
        if (!trial.display_replay_with_choices) {
          trial_html +=
            `<div id="standalone-replay">
              <button id="replay" class="jspsych-btn">
                <span></span>
              </button>
            </div>`;
        }
        // add optional HTML prompt
        if (trial.prompt) {
          trial_html += `<div id="jspsych-audio-selection-prompt">` + trial.prompt + `</div>`;
        }
        // add choice buttons
        trial_html += `<div id="jspsych-selection-btngroup">`;
        if (trial.display_replay_with_choices) {
          trial_html += // add inline replay button
            `<div class="jspsych-selection-btn">
              <button id="replay" class="jspsych-btn">
                <span></span>
              </button>
            </div>`;
        }
        if (trial.shuffle) {
          if (trial.data_choices) {
            [trial.choices, trial.data_choices] = shuffle_together(trial.choices, trial.data_choices);
          } else {
            trial.choices = jsPsych.randomization.shuffle(trial.choices);
            trial.data_choices = trial.choices;
          }
        } else if (!trial.data_choices) {
          trial.data_choices = trial.choices;
        }
        for (var i = 0; i < trial.choices.length; i++) {
          trial_html += 
            `<div class="jspsych-selection-btn jspsych-selection-glow" data-choice="${trial.data_choices[i]}">
              ${trial.button_html.replace(/%choice%/g, trial.choices[i])}
            </div>`;
        }
        trial_html += `</div>`;
        return trial_html;
      }
      // function to process the response
      function process_response(event) {
        // measure response time
        var rt = Math.round(performance.now() - start_time);
        // extract participant's selected button
        var choice = event.currentTarget;
        // get response
        var response = choice.getAttribute("data-choice");
        // remove glow on buttons
        btns.forEach(
          div => div.classList.remove(
            "jspsych-selection-glow",
            "jspsych-selection-incorrect",
            "jspsych-selection-answer",
          )
        );
        // kill any remaining setTimeout handlers
        jsPsych.pluginAPI.clearAllTimeouts();
        // if the question has an answer...
        if (trial.answer !== null) {
          // indicate whether the response is correct
          var correct = false;
          if (jsPsych.pluginAPI.compareKeys(trial.answer, response)) {
            correct = true;
          }
          // save the initial trial data (collected before feedback & correction)
          if (trial_data.response === null) {
            trial_data = {
              rt: rt,
              correct: correct,
              stimulus: trial.stimulus,
              response: response,
              answer: trial.answer,
            };
          }
          // trigger feedback
          display_feedback(choice, response, correct);
        // if the question has no answer...
        } else {
          // save the trial data
          trial_data = {
            rt: rt,
            stimulus: trial.stimulus,
            response: response,
          };
          // end the trial
          jsPsych.pluginAPI.setTimeout(end_trial, 200);
        }
      }
      // function to handle feedback to the subject
      function display_feedback(choice, response, correct, timeout = false) {
        // disable all but the correct button (unless correct)
        btns.forEach(
          div => {
            if (correct || div.getAttribute("data-choice") != trial.answer) {
              div.querySelector("button").disabled = true;
            }
          }
        );
        // provide feedback
        if (correct) {
          // add correct answer styling
          choice.classList.add("jspsych-selection-correct");
        } else {
          // add incorrect answer styling
          choice.classList.add("jspsych-selection-incorrect");
          // prompt subject to pick correct response (if specified)
          if (trial.force_correct_button_press && !timeout) {
            // add pick-me animation
            answer.classList.add("jspsych-selection-answer");
            // add event listener to the correct button (only)
            answer.addEventListener("click", process_response);
          } else {
            // add correct answer styling
            answer.classList.add("jspsych-selection-correct");
          }
        }
        // linger on correct answer before ending the trial (if specified)
        if (trial.linger_duration !== null && (correct || timeout || !trial.force_correct_button_press)) {
          jsPsych.pluginAPI.setTimeout(end_trial, trial.linger_duration);
        }
      }
      // function to end trial when it is time
      function end_trial() {
        // clear the display
        display_element.innerHTML = "";
        // move on to the next trial
        jsPsych.finishTrial(trial_data);
      }       
      // end trial if a time limit is set
      if (trial.trial_duration !== null) {
        jsPsych.pluginAPI.setTimeout(() => {
          display_feedback('', false, true);
        }, trial.trial_duration);
      }
    }
  }
  AudioSelectionPlugin.info = info;

  return AudioSelectionPlugin;

})(jsPsychModule);
