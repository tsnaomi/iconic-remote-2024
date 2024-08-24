var ex_base = (function() {

  // store non-task jsPsych experiment trials
  var EXPERIMENT = {};

  function generate() {

    // proceed button
    var proceed_btn = `
      <button id="proceed" class="jspsych-btn">
        <span class="function">c</span>
      </button>`;

    // function to help hide trial number on screen
    function hide_trial_number() {
      document.getElementById("trial-n").innerHTML = "";
    }

    // instructions
    EXPERIMENT.instructions = function(audio_buffer_name, character_fn, wait_to_play = WAIT_TO_PLAY) {
      // compose html
      var prompt = `
        <div id="character">
          <img src="${character_fn}"/>
        </div>`;

      // create trial
      return {
        type: jsPsychAudioSelection,
        stimulus: audio_buffer_name,
        prompt: prompt,
        choices: [proceed_btn, ],
        data_choices: ["proceed", ],
        button_html: `%choice%`,
        display_replay_with_choices: true,
        wait_to_play: wait_to_play,
        css_classes: ["instructions", ],
        on_load: hide_trial_number,
      }
    };

    // silent score
    EXPERIMENT.silent_score = function(block, n_attr) {
      return {
        type: jsPsychCallFunction,
        func: () => {},
        on_load: hide_trial_number,
        on_finish: function(data = {}) {
          score_items(block, n_attr, data);
        },
      };
    };

    // fake qualify
    EXPERIMENT.fake_qualify = function() {
      return {
        type: jsPsychCallFunction,
        func: () => {},
        on_load: hide_trial_number,
        on_finish: function(data = {}) {
          data.qualify = true;
        },
      };
    };

    // handoff
    EXPERIMENT.handoff = function(audio_buffer_name, character_fn) {
      // compose discreet button
      var discreet_btn = `
        <button id="discreet-btn" value="">
          <div id="character">
            <img src="${character_fn}"/>
          </div>
        </button>
        `;

      // create trial
      return {
        type: jsPsychAudioSelection,
        stimulus: audio_buffer_name,
        choices: [discreet_btn, ],
        data_choices: ["proceed", ],
        button_html: `%choice%`,
        wait_to_play: WAIT_TO_PLAY,
        css_classes: ["handoff", ],
        on_load: hide_trial_number,
      }
    };

    // display completion page & translation questionnaires
    EXPERIMENT.complete = function(ex, id, cond, phrase_func, phrases, lexicon) {

      // details page (incl. participant ID, condition, & download button)
      var details_page = `
        <div id="participant">
          ${id} <span class="cond">~ ${cond}</span>
        </div>`;

      // phrase translations
      var default_phrase = phrases.pop();
      var phrases_page = `<div id="phrases" class="iconic">`;
      phrases.forEach(phrase => phrases_page += `<p>${encode(phrase)}</p>`)
      phrases_page += `</div>`;

      // lexicon translations
      var lexicon_page = `<table id="lexicon" class="iconic">`;
      lexicon.forEach(row => {
        lexicon_page += `<tr>`;
        row.forEach(icon => lexicon_page += `<td><span class="icon-box">${encode(icon)}</span></td>`)
        lexicon_page += `</tr>`;
      })

      // compose trial
      var trial =  {
        type: jsPsychInstructions,
        pages: [details_page, phrases_page, lexicon_page],
        show_clickable_nav: true,
        button_label_previous: "<",
        button_label_next: ">",
        css_classes: ["questionnaire", ],
        on_start: function(trial) {
          // identify the participant-specific phrase translation & store it
          var phrase = phrase_func() || default_phrase;
          jsPsych.data.addProperties({ phrase: phrase });

          // grab all of the results...
          var results = jsPsych.data.get();

          // indicate whether the participant meets the qualification threshold
          if (results.filterCustom(trial => trial.qualify == true).count()) {
            trial.pages[0] = `<div id="qualify-star">&#11088;</div>` + trial.pages[0];
          }

          // add a button to download the results
          var file = new File([results.json(), ], `${ex}-v3-${id}.json`, {type: 'application/json', });
          trial.pages[0] += `
            <div id="download-results">
              <a download=${file.name} href=${URL.createObjectURL(file)}>
                <span class="function">d</span>
              </a>
            </div>`;

          // add the participant-specific phrase to the phrase translations
          trial.pages[1] = trial.pages[1].replace("#", encode(phrase));
        },
        on_load: hide_trial_number,
      };

      // loop indefinitely, womp womp
      return {
        timeline: [trial],
        loop_function: () => true,
      }
    };

    // return non-task trials
    return EXPERIMENT;
  }

  // return core generate function
  return generate;
})();
