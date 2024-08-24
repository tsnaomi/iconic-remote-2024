var m20 = (function() {

  // store images & jsPsych experiment blocks
  var EXPERIMENT = {
    demo: [],
    concepts: [],
    block1: {},
    block2: {},
    block3: {},
    block4: {},
    block5: {},
    added_trials: 0, // number of trials "enqueued" through adaptive learning
  };

  // ##########################################################################
  // Define internal helpers; capitalized variables get updated
  // ##########################################################################

  // store trial data associated with each block
  var DATA = {
    demo: [],
    concepts: [],
    block1: [],
    block2: [], queue2: {},
    block3: [], queue3: {},
    block4: [],
    block5: [],
  };

  // ==========================================================================
  // Trial counts; dynamically set in `tally_trials()`
  // ==========================================================================

  // block 2
  var N_MADLIB = 0;  // madlib trials
  var N_PICTURE = 0; // picture-selection trials
  var N_MOD = 0;     // modifier learning (N_MADLIB + N_PICTURE)

  // block 3
  var N_PROD_3 = 0;  // production practice (one-modifier NPs)

  // blocks 4 & 5
  var N_PROD_4 = 0;  // critical productions (two-modifier NPs)
  var N_PROD_5 = 0;  // critical productions (three-modifier NPs)

  // ==========================================================================
  // Artificial language
  // ==========================================================================

  // nouns
  var nouns = ["ball", "feather", "mug"];
  var noun_icons = ["B", "F", "M"];
  // var nouns = ["apple", "bowl", "pepper"];
  // var noun_icons = ["A", "O", "R"];

  // modifiers
  var adj_icons = ['r', 'b'];
  var num_icons = ['2', '3'];
  var dem_icons = ['p', 'd'];

  // verbs
  var point = "I"; // point ~ indicate
  var look = "L";  // look at ~ see

  // lexical lookup
  var lookup = {
    // icon2word
    B: "ball", F: "feather", M: "mug", A: "apple", O: "bowl", R: "pepper",
    p: "this", d: "that", b: "black", g: "green", r: "red", "2": "two", "3": "three",
    // word2icon
    ball: "B", feather: "F", mug: "M", apple: "A", bowl: "O", pepper: "R",
    this: "p", that: "d", black: "b", green: "g", red: "r", two: "2", three: "3",
  };

  // noun-initial or noun-final
  var CONDITION;

  // function to linearize NPs according to the condition
  var LINEARIZE = () => {};


  // function to reverse noun-final NP orders
  function noun_initial(arr) {
    return [...arr].reverse().join("");
  }

  // function to preserve noun-final NP orders
  function noun_final(arr) {
    return arr.join("");
  }

  // ==========================================================================
  // Event classes
  // ==========================================================================

  class Event {
    constructor(args) {
      var {m1, m2, m3, n, f, group, flip, item, queue} = args;

      // icons
      this.m1 = m1;
      this.m2 = m2;
      this.m3 = m3;
      this.n = n;
      this.v = group.includes('dem') ? point : look;

      // words
      this.mod1 = lookup[m1];
      this.mod2 = lookup[m2] || '';
      this.mod3 = lookup[m3] || '';
      this.noun = lookup[n];
      this.verb = lookup[this.v];

      // noun phrase (icon array)
      this.np_icons = [m1, m2, m3, n].filter(Boolean);

      // trial group
      this.f = f;
      this.foil = lookup[f];
      this.group = group;
      this.flip = flip;
      this.qidx = item;
      this.queue = queue;

      // stimulus filename
      this.fn = `${this.mod1}-${this.mod2}-${this.mod3}-${this.noun}`
        .replace(/-+/g, '-');
    }

    // --------------------------------------------------------------------------
    // Iconic phrases
    // --------------------------------------------------------------------------

    get NP() {
      return LINEARIZE(this.np_icons);
    }

    get NPs() {
      if (this.m2) {
        var variations = [
          this.NP,
          LINEARIZE([this.m2, this.m1, this.m3, this.n].filter(Boolean)),
          ];

        if (this.m3) {
          variations.push(
            LINEARIZE([this.m1, this.m3, this.m2, this.n]),
            LINEARIZE([this.m2, this.m3, this.m1, this.n]),
            LINEARIZE([this.m3, this.m1, this.m2, this.n]),
            LINEARIZE([this.m3, this.m2, this.m1, this.n]),
          );
        }

        return variations;
      }

      return this.NP;
    }

    get sent() {
      return 'X' + this.v + this.NP;
    }

    // we'll accept both SVO & VSO, since Mixtec is VSO
    get sents() {
      var NPs = this.NPs;

      if (typeof NPs == "string") {
        return [
          this.sent,             // SVO
          this.v + 'X' + this.NP // VSO
        ];
      }

      var sents = [];

      NPs.forEach((NP) => {
        sents.push('X' + this.v + NP); // SVO
        sents.push(this.v + 'X' + NP); // VSO
      });

      return sents;
    }

    // -------------------------------------------------------------------------
    // Foil (only relevant for one-modifier NPs)
    // -------------------------------------------------------------------------

    get foil_fn() {
      return this.fn.replace(this.mod1, this.foil);
    }
  }

  // ==========================================================================
  // Define helpers to generate and handle events
  // ==========================================================================

  // store transitive & intransitive events; each event corresponds to a trial
  var EVENTS = [];

  // function to generate events from a csv list
  function generate_events() {
    var list = M20_V3_LIST; // loaded elsewhere as js, welp
    var ev; // event

    // tally trial counts (extremely crude)
    tally_trials(list);

    // randomize lexical assignments s.t. participants get different lists
    // following the same template
    var [d1, d2] = jsPsych.randomization.shuffle(dem_icons);
    var [n1, n2] = jsPsych.randomization.shuffle(num_icons);
    var [a1, a2] = jsPsych.randomization.shuffle(adj_icons);
    var [N1, N2, N3] = jsPsych.randomization.shuffle(noun_icons);

    // populate list with randomized lexical items
    list = list
      .replace(/d1/g, d1)
      .replace(/d2/g, d2)
      .replace(/n1/g, n1)
      .replace(/n2/g, n2)
      .replace(/a1/g, a1)
      .replace(/a2/g, a2)
      .replace(/N1/g, N1)
      .replace(/N2/g, N2)
      .replace(/N3/g, N3);

    // convert csv text to objects
    list = csvToObj(
      data = list,
      param1 = ",",
      param2 = {
        _block: { type: 'number', group: 1 },
        _task: { type: 'string', group: 2 },
        _queue: { type: 'boolean', group: 3 },
        item: { type: 'number', group: 4 },
        m1: { type: 'string', group: 5 },
        m2: { type: 'string', group: 6 },
        m3: { type: 'string', group: 7 },
        n: { type: 'string', group: 8 },
        f: { type: 'string', group: 9 },
        group: { type: 'string', group: 10 },
        flip: { type: 'boolean', group: 11 },
      }
    );

    var queue = new DefaultDict(Number);
    var block = [];
    var prev_block = 1;
    var madlibs = [];
    var picture_selections = [];

    // generate events
    list.forEach((trial) => {

      // add the block to EVENTS, ordering main trials before queued trials
      if (trial._block !== prev_block) {
        if (prev_block == 2) {
          madlibs.sort((a, b) => (a.queue - b.queue || a.qidx - b.qidx));
          picture_selections.sort((a, b) => (a.queue - b.queue || a.qidx - b.qidx));
          block.push(...madlibs, ...picture_selections);
        } else {
          block.sort((a, b) => (a.queue - b.queue || a.qidx - b.qidx));
        }
        EVENTS.push(...block);
        block = [];
        prev_block = trial._block;
      }

      // determine the queue
      trial.queue = queue[trial.item]; // 0-indexed

      // creat event object
      ev = new Event(trial);

      // add the event to the block or task container
      if (trial._task == 'madlib') {
        madlibs.push(ev);
      } else if (trial._task == 'picture selection') {
        picture_selections.push(ev);
      } else {
        block.push(ev);
      }

      // increment the queue
      queue[trial.item] += 1;
    });

    // add the final block to EVENTS
    EVENTS.push(...block);

    // reverse the global EVENTS array for popping
    EVENTS = EVENTS.reverse();

    // erase erase erase
    M20_V3_LIST = null;
  }

  // function to tally global trial counts
  function tally_trials(list) {
    // block 2
    N_MADLIB += count(list, /madlib,FALSE/g);
    N_PICTURE += count(list, /picture selection,FALSE/g);
    N_MOD += N_MADLIB + N_PICTURE;
    QDIM_2 += (count(list, /madlib/g) / N_MADLIB);

    // block 3
    N_PROD_3 += count(list, /3,production,FALSE/g);
    QDIM_3 += (count(list, /3,production/g) / N_PROD_3);

    // blocks 4 & 5
    N_PROD_4 += count(list, /4,production/g);
    N_PROD_5 += count(list, /5,production/g);
  }

  // ==========================================================================
  // Define helpers to implement adaptive learning (& early stopping)
  // ==========================================================================

  // per-block max queue depth per adaptive learning trial
  var QDIM_2 = 0; // block 2
  var QDIM_3 = 0; // block 3

  // index of current trial per adaptive learning block
  var IDX_2 = 0;  // block 2
  var IDX_3 = 0;  // block 3

  // max number of trials that can be "enqueued" through adaptive learning;
  // if `added_trials` exceeds this number, early stopping will occur
  var max_added_trials = 1000; // all the trials!

  // function to populate trial from queue (on_start)
  function dequeue(trial, block, idx) {
    Object.assign(trial, block[idx]);

    // get around jsPsych's brittleness
    if (trial._type) {
      var e = {};
      e.info = trial._type.info;
      e.trial = new trial._type().trial;
      trial.type = e;
      delete trial._type;
    }
  }

  // function to queue an incorrect-inspired trial (on_finish)
  function enqueue(data, block, queue, dim) {
    if (!data.correct && data.queue < dim - 1) {

      // end the experiment early if the participant has completed more than
      // `max_added_trials` due to adaptive learning
      if (EXPERIMENT.added_trials + 1 > max_added_trials) {
        jsPsych.endExperiment();

      // otherwise, add a new trial to the queue!
      } else {
        EXPERIMENT.added_trials += 1; // increment # of enqueued trials

        // enqueue the new trial
        var pointer = `${data.qidx}-${data.queue + 1}`;
        block.push(queue[pointer]);
      }
    }
  }

  // ==========================================================================
  // Define helpers to generate and handle production keyboards
  // ==========================================================================

  var KEYBOARDS_3 = [];
  var KEYBOARDS_4 = [];
  var KEYBOARDS_5 = [];

  // noun keys
  var noun_keys = ['X', '#'];

  // word orders
  var word_orders = [
    // non-harmonic, non-isomorphic
    'aVnNd', 'aNdVn', 'aVdNn', 'nNdVa', 'nVdNa', 'dNnVa',
    // non-harmonic, scope-isomorphic
    'aNnVd', 'nNaVd', 'nVaNd', 'dNaVn', 'dVaNn', 'dVnNa',
    // noun-initial (first is scope-isomorphic)
    'NaVnd', 'NadVn', 'NnVad', 'NndVa', 'NdVan', 'NdnVa',
    // noun-final (first is scope-isomorphic)
    'anVdN', 'aVdnN', 'naVdN', 'nVdaN', 'daVnN', 'dVnaN',
  ];

  // function to generate a modifier keyboard
  function generate_keyboards() {
    var keyboards = [];

    word_orders.forEach((wo) => {
      keyboards.push(
        wo.replace('N', jsPsych.randomization.shuffle(noun_keys).join(''))
          .replace('a', jsPsych.randomization.shuffle(adj_icons).join(''))
          .replace('n', jsPsych.randomization.shuffle(num_icons).join(''))
          .replace('d', jsPsych.randomization.shuffle(dem_icons).join(''))
          .split('')
        );
    });

    // return randomly ordered  keyboards
    return jsPsych.randomization.shuffle(keyboards);
  }

  // function to add the verb & obj noun to production keyboards, womp womp
  function add_keys(trial) {
    // add verb
    trial.keys[trial.keys.indexOf("V")] = trial.data.v;

    // add object noun
    trial.keys[trial.keys.indexOf("#")] = trial.data.n;
  }

  // ==========================================================================
  // Define helpers to render simuli
  // ==========================================================================

  // set global linger duration
  var linger = 800;

  // function to generate text stimulus
  function stim_txt(str) {
    return encode(str);
  }

  // function to generate span stimulus
  function stim_span(str) {
    return `<span class="iconic">${encode(str)}</span>`;
  }

  // function to generate madlib stimulus string
  function stim_madlib(str, blank) {
    return str.split("").join(" ").replace(blank, "%blank%");
  }

  // function to generate image stimulus
  function stim_img(str, flip = false) {
    var src = `../_static/stimuli/m20/${str}.png`;

    if (flip) {
      return `<img class="flip" src="${src}" />`;
    } else {
      return `<img src="${src}" />`;
    }
  }

  // ==========================================================================
  // Define helpers to render trial number on screen
  // ==========================================================================

  // track trial number
  var N = 0;

  // pre-experiment trial numbers (reversed for popping)
  var ONSET_INDICES = [
    "c4", "c3", "c2", "c1", // concept review
    "p4", "p3", "p2", "p1", // practice
    "d4", "d3", "d2", "d1", // demo
  ];

  // update trial number
  function update_trial_number() {
    var counter = ONSET_INDICES.pop();

    if (!counter) {
      N += 1;
      counter = N;
    }

    document.getElementById("trial-n").innerHTML = counter;
  }

  // ==========================================================================
  // Define functions to generate each experiment block
  // ==========================================================================

  // 4 trials (Mixtec only)
  function demo() {

    // DEMO -------------------------------------------------------------------
    // Demo & practice
    // ------------------------------------------------------------------------

    // icon selection (mug)
    DATA.demo.push({
      type: jsPsychSelection,
      stimulus: stim_img("mug"),
      choices: noun_icons,
      answer: "M",
      button_html: `<button class="jspsych-btn iconic">%choice%</button>`,
      noun: "mug",
      subtype: "icon selection",
      css_classes: ["icon-selection", "demo"],
    });

    // picture selection (ball)
    DATA.demo.push({
      type: jsPsychSelection,
      stimulus: stim_span("B"),
      choices: nouns.map(c => stim_img(c)),
      data_choices: nouns.map(c => lookup[c]),
      answer: "B",
      button_html: null,
      noun: "ball",
      subtype: "picture selection",
      css_classes: ["picture-selection", "demo"],
    });

    // madlib (feather)
    DATA.demo.push({
      type: jsPsychMadlib,
      img_stimulus: stim_img("feather"),
      choices: noun_icons.map(stim_txt),
      data_choices: noun_icons,
      answer: "F",
      button_html: `<button class="jspsych-btn iconic">%choice%</button>`,
      noun: "feather",
      css_classes: ["demo", ],
    });

    // production (ball)
    DATA.demo.push({
      type: jsPsychProduction,
      stimulus: stim_img("ball"),
      keys: jsPsych.randomization.shuffle(noun_icons),
      answer: "B",
      noun: "ball",
      css_classes: ["demo", "jspsych-production"],
    });

    // create demo trials
    var demo_trials = {
      type: jsPsych.timelineVariable("type"),
      stimulus: jsPsych.timelineVariable("stimulus"),
      img_stimulus: jsPsych.timelineVariable("img_stimulus"),
      caption_stimulus: jsPsych.timelineVariable("caption_stimulus"),
      choices: jsPsych.timelineVariable("choices"),
      data_choices: jsPsych.timelineVariable("data_choices"),
      keys: jsPsych.timelineVariable("keys"),
      answer: jsPsych.timelineVariable("answer"),
      button_html: jsPsych.timelineVariable("button_html"),
      show_feedback: true,
      force_correct_button_press: true,
      force_correct_production: true,
      include_spacebar: false,
      include_counter: false,
      fill_in_the_blanks: true,
      linger_duration: linger,
      on_load: update_trial_number,
      css_classes: jsPsych.timelineVariable("css_classes"),
      data: {
        block: 0,
        n_mod: 0,
        group: null,
        noun: jsPsych.timelineVariable("noun"),
        subtype: jsPsych.timelineVariable("subtype"),
      },
    };

    // create demo block
    EXPERIMENT.demo = {
      timeline: [demo_trials, ],
      timeline_variables: DATA.demo,
      randomize_order: false,
    };
  }

  // 4 trials
  function concept_review() {

    // DEMO -------------------------------------------------------------------
    // Conceptual review
    // ------------------------------------------------------------------------

    // Which picture shows THIS feather?
    DATA.concepts.push({
      stimulus: "this_feather",
      choices: [stim_img("this-feather", flip = true), stim_img("that-feather", flip = true)],
      data_choices: ["p", "d"],
      answer: "p",
      noun: "feather",
    });

    // Which picture shows THAT ball?
    DATA.concepts.push({
      stimulus: "that_ball",
      choices: [stim_img("this-ball"), stim_img("that-ball")],
      data_choices: ["p", "d"],
      answer: "d",
      noun: "ball",
    });

    // Which picture shows THESE mugs?
    DATA.concepts.push({
      stimulus: "these_mugs",
      choices: [stim_img("this-three-mug"), stim_img("that-three-mug")],
      data_choices: ["p", "d"],
      answer: "p",
      noun: "mug",
    });

    // Which picture shows THOSE feathers?
    DATA.concepts.push({
      stimulus: "those_feathers",
      choices: [stim_img("this-two-feather", flip = true), stim_img("that-two-feather", flip = true)],
      data_choices: ["p", "d"],
      answer: "d",
      noun: "feather",
    });

    // create concept review trials
    var concept_trials = {
      type: jsPsychAudioSelection,
      stimulus: jsPsych.timelineVariable("stimulus"),
      choices: jsPsych.timelineVariable("choices"),
      data_choices: jsPsych.timelineVariable("data_choices"),
      answer: jsPsych.timelineVariable("answer"),
      button_html: null,
      force_correct_button_press: true,
      wait_to_play: WAIT_TO_PLAY,
      linger_duration: linger,
      css_classes: ["picture-selection", "demo"],
      on_load: update_trial_number,
      data: {
        block: 0.5,
        n_mod: 0,
        group: null,
        noun: jsPsych.timelineVariable("noun"),
        subtype: "picture selection",
      },
    };

    // create concept review block
    EXPERIMENT.concepts = {
      timeline: [concept_trials, ],
      timeline_variables: DATA.concepts,
      randomize_order: false,
    };
  }

  // 3 trials
  function block1() {

    // BLOCK 1 ----------------------------------------------------------------
    // Noun learning
    // ------------------------------------------------------------------------

    var noun;

    for (let i = 0; i < nouns.length; i++) {
      noun = nouns[i];

      // icon selection
      DATA.block1.push({
        stimulus: stim_img(noun),
        choices: noun_icons,
        answer: noun_icons[i],
        button_html: `<button class="jspsych-btn iconic">%choice%</button>`,
        noun: noun,
      });
    }

    // create block 1 trials
    var block1_trials = {
      type: jsPsychSelection,
      stimulus: jsPsych.timelineVariable("stimulus"),
      choices: jsPsych.timelineVariable("choices"),
      data_choices: jsPsych.timelineVariable("data_choices"),
      answer: jsPsych.timelineVariable("answer"),
      button_html: jsPsych.timelineVariable("button_html"),
      force_correct_button_press: true,
      linger_duration: linger,
      on_load: update_trial_number,
      css_classes: ["icon-selection", ],
      data: {
        block: 1,
        n_mod: 0,
        group: null,
        noun: jsPsych.timelineVariable("noun"),
        subtype: "icon-selection",
        css_classes: ["icon-selection", ],
      },
    };

    // create block 1
    EXPERIMENT.block1 = {
      timeline: [block1_trials, ],
      timeline_variables: DATA.block1,
      randomize_order: true,
    };
  }

  // 12+ trials
  function block2() {

    // BLOCK 2 ----------------------------------------------------------------
    // Modifier learning
    // ------------------------------------------------------------------------

    var ev; // event
    var choices;
    var trial;
    var pointer;

    // madlib
    for (let i = 0; i < N_MADLIB * QDIM_2; i++) {
      ev = EVENTS.pop();
      choices = [ev.m1, ev.f];
      trial = {
        _type: jsPsychMadlib,
        img_stimulus: stim_img(ev.fn, ev.flip),
        caption_stimulus: stim_madlib(ev.sent, ev.m1),
        choices: choices.map(stim_txt),
        data_choices: choices,
        answer: ev.m1,
        button_html: `<button class="jspsych-btn iconic">%choice%</button>`,
        data: {
          block: 2,
          n_mod: 1,
          group: ev.group,
          noun: ev.noun,
          foil: ev.f,
          flip: ev.flip,
          qidx: ev.qidx,
          queue: ev.queue,
        },
      };

      // main madlib trial
      if (i < N_MADLIB) {
        DATA.block2.push(trial);

      // queued trial
      } else {
        pointer = `${trial.data.qidx}-${trial.data.queue}`;
        DATA.queue2[pointer] = trial;
      }
    }

    // picture selection
    for (let i = 0; i < N_PICTURE * QDIM_2; i++) {
      ev = EVENTS.pop();
      choices = [
        stim_img(ev.fn, ev.flip),
        stim_img(ev.foil_fn, ev.flip),
      ];
      trial = {
        _type: jsPsychSelection,
        stimulus: stim_span(ev.sent),
        choices: choices,
        data_choices: [ev.m1, ev.f],
        answer: ev.m1,
        css_classes: ["picture-selection", ],
        data: {
          block: 2,
          n_mod: 1,
          group: ev.group,
          noun: ev.noun,
          foil: ev.f,
          flip: ev.flip,
          qidx: ev.qidx,
          queue: ev.queue,
          subtype: "picture selection",
        }
      };

      // main picture-selection trial
      if (i < N_PICTURE) {
        DATA.block2.push(trial);

      // queued trial
      } else {
        pointer = `${trial.data.qidx}-${trial.data.queue}`;
        DATA.queue2[pointer] = trial;
      }
    }

    // randomize block 2 trials
    DATA.block2 = jsPsych.randomization.shuffle(DATA.block2);

    // create block 2 trial template
    var block2_trial = {
      type: jsPsychSelection, // placeholder
      stimulus: "placeholder",
      choices: ["placeholder", ],
      data_choices: ["place", "holder"],
      answer: "placeholder",
      force_correct_button_press: true,
      linger_duration: linger,
      on_load: update_trial_number,
      on_start: (trial) => dequeue(trial, DATA.block2, IDX_2),
      on_finish: (data) => enqueue(data, DATA.block2, DATA.queue2, QDIM_2),
    };

    // create block 2 loop
    EXPERIMENT.block2 = {
      timeline: [block2_trial, ],
      loop_function: function() {
        IDX_2 += 1;
        return IDX_2 < DATA.block2.length;
      }
    };
  }

  // 6+ trials
  function block3() {

    // BLOCK 3 ----------------------------------------------------------------
    // One-modifier NP practice
    // ------------------------------------------------------------------------

    var ev; // event
    var trial;
    var pointer;

    // production (one-modifier NPs)
    for (let i = 0; i < N_PROD_3 * QDIM_3; i++) {
      ev = EVENTS.pop();
      trial = {
        stimulus: stim_img(ev.fn, ev.flip),
        answer: ev.sent,
        data: {
          block: 3,
          n_mod: 1,
          group: ev.group,
          noun: ev.noun,
          flip: ev.flip,
          qidx: ev.qidx,
          queue: ev.queue,
          n: ev.n,
          v: ev.v,
        }
      };

      // main trial
      if (i < N_PROD_3) {
        DATA.block3.push(trial);

      // queued trial
      } else {
        pointer = `${trial.data.qidx}-${trial.data.queue}`;
        DATA.queue3[pointer] = trial;
      }
    }

    // randomize block 3 trials
    DATA.block3 = jsPsych.randomization.shuffle(DATA.block3);

    // create block 3 trial template
    var block3_trial = {
      type: jsPsychProduction,
      stimulus: "placeholder",
      keys: () => KEYBOARDS_3.pop(),
      show_feedback: true,
      force_correct_production: true,
      include_spacebar: false,
      include_counter: false,
      fill_in_the_blanks: true,
      linger_duration: linger,
      css_classes: ["jspsych-production", ],
      on_load: update_trial_number,
      on_start: function(trial) {
        dequeue(trial, DATA.block3, IDX_3);
        add_keys(trial);
      },
      on_finish: (data) => enqueue(data, DATA.block3, DATA.queue3, QDIM_3),
    };

    // create block 3 loop
    EXPERIMENT.block3 = {
      timeline: [block3_trial, ],
      loop_function: function() {
        IDX_3 += 1;
        return IDX_3 < DATA.block3.length;
      }
    };
  }

  // 24 trials
  function block4() {

    // BLOCK 4 ----------------------------------------------------------------
    // Two-modifier NP productions
    // ------------------------------------------------------------------------

    var ev; // event

    // production (critical two-modifier NPs)
    for (let i = 0; i < N_PROD_4; i++) {
      ev = EVENTS.pop();
      DATA.block4.push({
        stimulus: stim_img(ev.fn, ev.flip),
        keys: KEYBOARDS_4.pop(),
        answer: ev.sents,
        group: ev.group,
        noun: ev.noun,
        flip: ev.flip,
        n: ev.n,
        v: ev.v,
      });
    }

    // create block 4 trials
    var block4_trials = {
      type: jsPsychProduction,
      stimulus: jsPsych.timelineVariable("stimulus"),
      keys: jsPsych.timelineVariable("keys"),
      answer: jsPsych.timelineVariable("answer"),
      show_feedback: false,
      force_correct_production: false,
      include_spacebar: false,
      include_counter: false,
      fill_in_the_blanks: true,
      linger_duration: null,
      on_load: update_trial_number,
      on_start: (trial) => add_keys(trial),
      on_finish: is_isomorphic,
      css_classes: ["jspsych-production", ],
      data: {
        block: 4,
        n_mod: 2,
        group: jsPsych.timelineVariable("group"),
        noun: jsPsych.timelineVariable("noun"),
        flip: jsPsych.timelineVariable("flip"),
        n: jsPsych.timelineVariable("n"),
        v: jsPsych.timelineVariable("v"),
      }
    };

    // create block 4
    EXPERIMENT.block4 = {
      timeline: [block4_trials, ],
      timeline_variables: DATA.block4,
      randomize_order: true,
    };
  }

  // 5 trials
  function block5() {

    // BLOCK 5 ----------------------------------------------------------------
    // Three-modifier NP productions
    // ------------------------------------------------------------------------

    var ev; // event

    // production (critical three-modifier NPs)
    for (let i = 0; i < N_PROD_5; i++) {
      ev = EVENTS.pop();
      DATA.block5.push({
        stimulus: stim_img(ev.fn, ev.flip),
        keys: KEYBOARDS_5.pop(),
        answer: ev.sents,
        group: ev.group,
        noun: ev.noun,
        flip: ev.flip,
        n: ev.n,
        v: ev.v,
      });
    }

    // create block 5 trials
    var block5_trials = {
      type: jsPsychProduction,
      stimulus: jsPsych.timelineVariable("stimulus"),
      keys: jsPsych.timelineVariable("keys"),
      answer: jsPsych.timelineVariable("answer"),
      show_feedback: false,
      force_correct_production: false,
      include_spacebar: false,
      include_counter: false,
      fill_in_the_blanks: true,
      linger_duration: null,
      on_load: update_trial_number,
      on_start: (trial) => add_keys(trial),
      on_finish: is_isomorphic,
      css_classes: ["jspsych-production", ],
      data: {
        block: 4,
        n_mod: 3,
        group: jsPsych.timelineVariable("group"),
        noun: jsPsych.timelineVariable("noun"),
        flip: jsPsych.timelineVariable("flip"),
        n: jsPsych.timelineVariable("n"),
        v: jsPsych.timelineVariable("v"),
      }
    };

    // create block 5
    EXPERIMENT.block5 = {
      timeline: [block5_trials, ],
      timeline_variables: DATA.block5,
      randomize_order: true,
    };
  }

  // ==========================================================================
  // Define core function to generate blocked trials
  // ==========================================================================

  function generate(condition) {

    // set global condition
    CONDITION = condition;

    // set linearization function based on condition
    LINEARIZE = CONDITION == "noun-initial" ? noun_initial : noun_final;

    // generate keyboard
    KEYBOARDS_3 = generate_keyboards();
    KEYBOARDS_4 = generate_keyboards();
    KEYBOARDS_5 = generate_keyboards();

    // generate trial events
    generate_events();

    // generate blocks
    demo();
    concept_review();
    block1();
    block2();
    block3();
    block4();
    block5();

    // return trial blocks
    return EXPERIMENT;
  }

  // return core generate function
  return generate;
})();
