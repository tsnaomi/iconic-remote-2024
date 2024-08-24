// https://stackoverflow.com/questions/19127650/defaultdict-equivalent-in-javascript
class DefaultDict {
  constructor(defaultInit) {
    return new Proxy({}, {
      get: (target, name) => name in target ?
        target[name] :
        (target[name] = typeof defaultInit === 'function' ?
          new defaultInit().valueOf() :
          defaultInit)
    });
  }
}

async function read_csv(url) {
  return await fetch(url);
}

function count(text, regex) {
  return (text.match(regex) || []).length;
}

function encode(text) {
  text = text.replace(/r/g, `<span class="iconic-red">r</span>`);
  return text;
}

function random_indices(len) {
  return jsPsych.randomization.shuffle([...Array(len).keys()]);
}

function shuffle_together(x, y) {
  var _x = [];
  var _y = [];
  random_indices(x.length).forEach(i => {
    _x.push(x[i]);
    _y.push(y[i]);
  });
  return [_x, _y];
}

function is_isomorphic(data = {}, iso_slice = 2) {
  if (data.correct) {
    var answers = data.answer.split(' ~ ');
    // if (answers.length >= 4) {
    if (answers.length > 2) {
      data.isomorphic = answers.slice(0, iso_slice).includes(data.response);
    } else {
      data.isomorphic = answers[0] == data.response;
    }
  }
}

function score_items(block, n_attr, data = {}) {
  // extract the relevant trials
  var blocks = [];
  if (Number.isInteger(block)) {
    blocks.push({block: block});
  } else {
    block.forEach(b => blocks.push({block: b}));
  }
  var trials = jsPsych.data.get()
    .filter(blocks);
  var n_critical = trials
    .filterCustom(trial => trial[n_attr] >= 2)
    .count()
  var n_non_critical = trials
    .filter({[n_attr]: 1})
    .count();
  // score the critical trials
  data.critical_score = trials
    .filter({correct: true})
    .filterCustom(trial => trial[n_attr] >= 2)
    .count();
  // score the non-critical trials (if any)
  if (n_non_critical) {
    data.non_critical_score = trials
      .filter({[n_attr]: 1, correct: true})
      .count();
  } else {
    data.non_critical_score = null;
  }
  // determine whether the participant qualified for the study
  data.qualify = data.critical_score / n_critical >= 0.75;
  if (n_non_critical) {
    data.qualify = data.qualify && data.non_critical_score / n_non_critical >= 0.8;
  }
  // calculate the percentage of responses that are scope-isomorphic
  // (out of the correct critical responses)
  data.percent_isomorphic = trials
    .filter({isomorphic: true})
    .count();
  data.percent_isomorphic /= data.critical_score;
  data.percent_isomorphic *= 100;
}

function m20_phrase() {
  var phrase;
  // extract the form element to be populated
  var correct = jsPsych.data.get().filter({n_mod: 3, correct: true});
  // identify the participant's response to be translated, one that matches
  // their scope-isomorphism preference
  if (correct.trials.length) {
    var perc_iso = correct.filter({isomorphic: true}).count() / correct.count();
    phrase = correct
      .filter({isomorphic: perc_iso >= 0.5})
      .select("response").values.pop();
  }
  return phrase;
}
