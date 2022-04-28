import { loadStdlib } from "@reach-sh/stdlib";
import * as backend from "./build/index.main.mjs";
import { ask, yesno, done } from "@reach-sh/stdlib/ask.mjs";

(async () => {
  const stdlib = await loadStdlib();
  const isPlayer1 = await ask(`Are you Player1?`, yesno);
  const who = isPlayer1 ? "Player1" : "Player2";
  console.log(`Starting Morra game as ${who}`);

  let acc = null;
  const createAcc = await ask(
    `Would you like to create an account? (only possible on devnet)`,
    yesno
  );

  if (createAcc) {
    acc = await stdlib.newTestAccount(stdlib.parseCurrency(1000));
  } else {
    const secret = await ask(`What is your account secret?`, (x) => x);
    acc = await stdlib.newAccountFromSecret(secret);
  }

  let ctc = null;
  const deployCtc = await ask(
    `Do you want to deploy the contract? (y/n)`,
    yesno
  );
  if (deployCtc) {
    ctc = acc.deploy(backend);
    const info = await ctc.getInfo();
    console.log(`The contract is deployed as = ${JSON.stringify(info)}`);
  } else {
    const info = await ask(
      `Please paste the contract information:`,
      JSON.parse
    );
    ctc = acc.attach(backend, info);
  }

  const fmt = (x) => stdlib.formatCurrency(x, 4);
  const getBalance = async () => fmt(await stdlib.balanceOf(acc));

  const before = await getBalance();
  console.log(`Your balance is ${before}`);

  const interact = { ...stdlib.hasRandom };
  interact.play = async () => {
    console.log(`${who} played`);
    const fingers = await ask("Please enter number of fingers?", parseInt);
    const prediction = await ask(
      "Please enter number for prediction?",
      parseInt
    );
    return [fingers, prediction];
  };

  if (isPlayer1) {
    const amt = await ask(
      `How much do you want to wager?`,
      stdlib.parseCurrency
    );
    interact.wager = amt;
  } else {
    interact.acceptWager = async (amt) => {
      const accepted = await ask(
        `Do you accept the wager of ${fmt(amt)}?`,
        yesno
      );
      if (accepted) {
        return true;
      } else {
        process.exit(0);
        return false;
      }
    };
  }
  const WINNING_STATES = ["Its a draw", "Player 1 wins", "Player 2 wins"];

  interact.displayWinner = (index) => {
    console.log(
      `Displaying Result for ${who} Result:  ${WINNING_STATES[index]}`
    );
  };

  const part = isPlayer1 ? backend.Player1 : backend.Player2;
  await part(ctc, interact);

  const after = await getBalance();
  console.log(`Your balance is now ${after}`);

  done();
})();
