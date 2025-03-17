import crypto from 'crypto';
import Table from 'cli-table';


class Dice {
  constructor(values) {
    this.values = values;
  }

  roll(index) {
    return this.values[index];
  }

  get length() {
    return this.values.length;
  }
}


class FairRandomGenerator {
  static generateKey() {
    return crypto.randomBytes(32).toString('hex'); 
  }

  static generateRandomNumber(max) {
    return crypto.randomInt(0, max); 
  }

  static calculateHMAC(key, message) {
    return crypto.createHmac('sha3-256', key).update(message.toString()).digest('hex');
  }
}


class ProbabilityCalculator {
  static calculateProbabilities(dice) {
    const probabilities = [];
    for (let i = 0; i < dice.length; i++) {
      probabilities[i] = [];
      for (let j = 0; j < dice.length; j++) {
        if (i === j) {
          probabilities[i][j] = '-'; 
          continue;
        }
        let wins = 0;
        for (const userRoll of dice[i].values) {
          for (const computerRoll of dice[j].values) {
            if (userRoll > computerRoll) wins++;
          }
        }
        probabilities[i][j] = ((wins / (dice[i].length * dice[j].length)) * 100).toFixed(2) + '%';
      }
    }
    return probabilities;
  }
}


class HelpTableGenerator {
  static generateTable(dice, probabilities) {
    const table = new Table({
      head: ['User Dice \\ Computer Dice', ...dice.map((_, i) => `Dice ${i + 1}`)],
    });

    dice.forEach((_, i) => {
      table.push([`Dice ${i + 1}`, ...probabilities[i]]);
    });

    console.log('\nProbability of the win for the user:');
    console.log(table.toString());
  }
}


class Game {
  constructor(diceConfigs) {
    this.dice = diceConfigs.map((config) => new Dice(config));
    this.currentPlayer = null;
  }

  
  async determineFirstMove() {
    console.log("Let's determine who makes the first move.");
    const key = FairRandomGenerator.generateKey();
    const computerChoice = FairRandomGenerator.generateRandomNumber(2);
    const hmac = FairRandomGenerator.calculateHMAC(key, computerChoice);

    console.log(`I selected a random value in the range 0..1 (HMAC=${hmac}).`);
    const userChoice = await this.promptUser("Try to guess my selection.\n0 - 0\n1 - 1\nX - exit\n? - help\nYour selection: ");

    if (userChoice === 'X') process.exit(0);
    if (userChoice === '?') {
      this.showHelp();
      return this.determineFirstMove();
    }

    console.log(`My selection: ${computerChoice} (KEY=${key}).`);
    const result = (computerChoice + parseInt(userChoice)) % 2;
    this.currentPlayer = result === 0 ? 'user' : 'computer';
    console.log(`${this.currentPlayer === 'user' ? 'You' : 'I'} make the first move.`);
  }

  
  async play() {
    await this.determineFirstMove();

    let computerDice, userDice;

    if (this.currentPlayer === 'user') {
      
      const userDiceIndex = await this.promptUser(
        `Choose your dice:\n${this.dice
          .map((d, i) => `${i} - ${d.values.join(',')}`)
          .join('\n')}\nX - exit\n? - help\nYour selection: `
      );

      if (userDiceIndex === 'X') process.exit(0);
      if (userDiceIndex === '?') {
        this.showHelp();
        return this.play();
      }

      
      const index = parseInt(userDiceIndex, 10);
      if (isNaN(index) || index < 0 || index >= this.dice.length) {
        console.log('Invalid selection. Please choose a valid dice index.');
        return this.play();
      }

      userDice = this.dice[index];
      console.log(`You choose the [${userDice.values.join(',')}] dice.`);

      
      const availableDice = this.dice.filter((_, i) => i !== index);
      const computerDiceIndex = FairRandomGenerator.generateRandomNumber(availableDice.length);
      computerDice = availableDice[computerDiceIndex];
      console.log(`I choose the [${computerDice.values.join(',')}] dice.`);
    } else {
      
      const computerDiceIndex = FairRandomGenerator.generateRandomNumber(this.dice.length);
      computerDice = this.dice[computerDiceIndex];
      console.log(`I choose the [${computerDice.values.join(',')}] dice.`);

      
      const availableDice = this.dice.filter((_, i) => i !== computerDiceIndex);
      const userDiceIndex = await this.promptUser(
        `Choose your dice:\n${availableDice
          .map((d, i) => `${i} - ${d.values.join(',')}`)
          .join('\n')}\nX - exit\n? - help\nYour selection: `
      );

      if (userDiceIndex === 'X') process.exit(0);
      if (userDiceIndex === '?') {
        this.showHelp();
        return this.play();
      }

      
      const index = parseInt(userDiceIndex, 10);
      if (isNaN(index) || index < 0 || index >= availableDice.length) {
        console.log('Invalid selection. Please choose a valid dice index.');
        return this.play();
      }

      userDice = availableDice[index];
      console.log(`You choose the [${userDice.values.join(',')}] dice.`);
    }

    const userRoll = await this.fairRoll(userDice.length, 'your');
    const computerRoll = await this.fairRoll(computerDice.length, 'my');

    console.log(`Your roll result: ${userDice.values[userRoll]}.`); 
    console.log(`My roll result: ${computerDice.values[computerRoll]}.`); 

    if (userDice.values[userRoll] > computerDice.values[computerRoll]) console.log('You win!');
    else if (userDice.values[userRoll] < computerDice.values[computerRoll]) console.log('I win!');
    else console.log("It's a tie!");
  }

  
  async fairRoll(max, player) {
    const key = FairRandomGenerator.generateKey();
    const computerNumber = FairRandomGenerator.generateRandomNumber(max);
    const hmac = FairRandomGenerator.calculateHMAC(key, computerNumber);

    console.log(`I selected a random value in the range 0..${max - 1} (HMAC=${hmac}).`);
    const userNumber = await this.promptUser(`Add your number modulo ${max}.\n${Array.from({ length: max }, (_, i) => `${i} - ${i}`).join('\n')}\nX - exit\n? - help\nYour selection: `);

    if (userNumber === 'X') process.exit(0);
    if (userNumber === '?') {
      this.showHelp();
      return this.fairRoll(max, player);
    }

    
    const number = parseInt(userNumber, 10);
    if (isNaN(number) || number < 0 || number >= max) {
      console.log('Invalid input. Please enter a number within the valid range.');
      return this.fairRoll(max, player);
    }

    const result = (computerNumber + number) % max;
    console.log(`My number is ${computerNumber} (KEY=${key}).`);
    console.log(`The fair number generation result is ${computerNumber} + ${number} = ${result} (mod ${max}).`);
    return result; 
  }

  
  showHelp() {
    const probabilities = ProbabilityCalculator.calculateProbabilities(this.dice);
    HelpTableGenerator.generateTable(this.dice, probabilities);
  }

  
  async promptUser(prompt) {
    process.stdout.write(prompt);
    return new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        const input = data.toString().trim();
        if (input === '?') {
          this.showHelp(); 
          resolve(this.promptUser(prompt)); 
        } else {
          resolve(input);
        }
      });
    });
  }
}


function main() {
  console.log(`
  ============================
  Non-Transitive Dice Game
  ============================
  `);

  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Error: At least 3 dice configurations are required.');
    console.error('Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3');
    process.exit(1);
  }

  const diceConfigs = args.map((arg) => {
    const values = arg.split(',').map((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num)) {
        console.error(`Error: Invalid Dice Value '${val}'. All values must be integers.`);
        process.exit(1);
      }
      return num;
    });
    return values;
  });

  const game = new Game(diceConfigs);
  game.play();
}

main();