const keyCodeLowerA = 'a'.charCodeAt(0);
const keyCodeUpperA = 'A'.charCodeAt(0);

const randomInt = (lower, higher, inclusive = false) => {
  return Math.floor(Math.random() * (higher - lower + (inclusive ? 1 : 0)) + lower);
}

const randomLetter = () => {
  const letter = Math.floor(Math.random() * 26);
  const uppercase = Math.random() > 0.5;
  return String.fromCharCode(letter + (uppercase ? keyCodeUpperA : keyCodeLowerA));
}

const randomWord = (lower, higher) => {
  let word = '';

  let numChars = lower;
  if (higher != null) {
    numChars = randomInt(lower, higher);
  }

  for (let i = 0; i < numChars; i++) {
    word += randomLetter();
  }

  return word;
};

const randomPhoneNumber = () => {
  return randomInt(1000000000, 10000000000);
};

const randomParagraph = numWords => {
  let paragraph = randomWord(3, 10);
  for (let i = 1; i < numWords; i++) {
    paragraph += ' ' + randomWord(3, 10);
  }

  return paragraph;
};

const randomAlphaNumeric = numChars => {
  let str = '';
  for (let i = 0; i < numChars; i++) {
    str += Math.random() > 0.5 ? randomLetter() : randomInt(0, 10);
  }

  return str;
};

const scrambleArray = arr => {
  let len = arr.length;
  let scrambles = len;

  for (let i = 0; i < scrambles; i++) {
    let idx1 = randomInt(0, len);
    let idx2 = randomInt(0, len);
    // swap the two elements
    let temp = arr[idx1];
    arr[idx1] = arr[idx2];
    arr[idx2] = temp;
  }
};

module.exports = {
  randomInt,
  randomLetter,
  randomWord,
  randomPhoneNumber,
  randomParagraph,
  randomAlphaNumeric,
  scrambleArray
};
