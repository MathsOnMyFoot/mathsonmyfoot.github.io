import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, set, query, orderByChild, limitToLast, get, startAt, runTransaction, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyBaDnTQU4C9BvNbJS29g0SXnil3MhmxJjs",
  authDomain: "mathcharm-1aaa4.firebaseapp.com",
  databaseURL: "https://mathcharm-1aaa4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mathcharm-1aaa4",
  storageBucket: "mathcharm-1aaa4.firebasestorage.app",
  messagingSenderId: "841601034536",
  appId: "1:841601034536:web:c8aff465474012a34a481d",
  measurementId: "G-6ELN78VR0G",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- GAME VARS ---
let currentUser = null;
let score = 0;
let currentAnswer = 0;
let timer;
let timeLeft = 10;
const TIME_LIMIT = 10;
let isSignUpMode = true;
let previousScreenBeforeProfile = null;

// Elements
const authScreen = document.getElementById("auth-screen");
const startScreen = document.getElementById("start-screen");
const viewLeaderboardScreen = document.getElementById("view-leaderboard-screen");
const profileViewerScreen = document.getElementById("profile-viewer-screen");
const gameScreen = document.getElementById("game-screen");
const leaderboardScreen = document.getElementById("leaderboard-screen");

const authTitle = document.getElementById("auth-title");
const authDesc = document.getElementById("auth-desc");
const forgotPasswordContainer = document.getElementById("forgot-password-container");
const authForgotLink = document.getElementById("auth-forgot-link");
const authUsername = document.getElementById("auth-username");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleText = document.getElementById("auth-toggle-text");
const authToggleLink = document.getElementById("auth-toggle-link");
const authTopPlayerDiv = document.querySelector("marquee");

const welcomeUsername = document.getElementById("welcome-username");
const statsGamesPlayed = document.getElementById("stats-games-played");
const startBtn = document.getElementById("start-btn");
const viewLeaderboardBtn = document.getElementById("view-leaderboard-btn");
const backToMenuBtn = document.getElementById("back-to-menu-btn");
const logoutBtn = document.getElementById("logout-btn");

const profileName = document.getElementById("profile-name");
const profileUidText = document.getElementById("profile-uid-text");
const profileGamesPlayed = document.getElementById("profile-games-played");
const profileHighestScore = document.getElementById("profile-highest-score");
const profileTimestamp = document.getElementById("profile-timestamp");
const profileCloseBtn = document.getElementById("profile-close-btn");

const scoreVal = document.getElementById("score-val");
const timerVal = document.getElementById("timer-val");
const timerBar = document.getElementById("timer-bar");
const equationDisplay = document.getElementById("equation-display");
const optionsContainer = document.getElementById("options-container");
const finalScore = document.getElementById("final-score");

const standaloneLeaderboardList = document.getElementById("standalone-leaderboard-list");
const gameoverLeaderboardList = document.getElementById("gameover-leaderboard-list");

const restartBtn = document.getElementById("restart-btn");
const exitBtn = document.getElementById("exit-btn");




// *** AUTHENTICATION STATE OBSERVER ***
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    welcomeUsername.innerText = user.displayName || "Anonymous";

    // Show Start Screen and Hide Auth Screen
    blitScreen(startScreen);

    // Show Runs Played Stats
    const userStatsRef = ref(db, `users/${currentUser.uid}/gamesPlayed`);

    // This listens to changes continuously and does not need async/await
    onValue(userStatsRef, (snapshot) => {
        if (snapshot.exists()) {
            statsGamesPlayed.innerText = snapshot.val();
        } else {
            statsGamesPlayed.innerText = "0";
        }

    }, (error) => {
        console.error("Listener failed:", error);
    });
  } else {
    currentUser = null;
    blitScreen(authScreen);


    // Showing LeaderBoard Top Player in the Auth Banner
    const leaderboardRef = ref(db, 'leaderboard');
    // Query the single highest score
    const topScoreQuery = query(leaderboardRef, orderByChild('score'), limitToLast(1));
    onValue(topScoreQuery, (snapshot) => {
        try {
            if (snapshot.exists()) {
                let topPlayer = null;
                
                // Loop runs exactly once because limitToLast(1) returns a single child
                snapshot.forEach((childSnapshot) => {
                    topPlayer = childSnapshot.val();
                });

                if (topPlayer) {
                    authTopPlayerDiv.innerHTML = `🏆 <strong>${topPlayer.name}</strong> is leading the game with <strong>${topPlayer.score}</strong> points! &nbsp; | &nbsp; <b>Be the next one to Rock!!</b> 🫵`;
                    authTopPlayerDiv.style.display = "block";
                }
            } else {
                authTopPlayerDiv.style.display = "none";
            }
        } catch (e) {
            console.error("Error processing top player data:", e);
            authTopPlayerDiv.style.display = "none";
        }
    }, (error) => {
        console.error("Error fetching top player for auth banner:", error);
        authTopPlayerDiv.style.display = "none";
    });




  }
});


// --- PROFILE VIEW LOGIC ---
async function openUserProfileCard(uid, displayName, originScreen) {
  previousScreenBeforeProfile = originScreen;
  blitScreen(profileViewerScreen);

  profileName.innerText = displayName;
  profileUidText.innerText = `ID: ${uid}`;
  profileGamesPlayed.innerText = "Loading...";

  try {
    const targetUserStatsRef = ref(db, `users/${uid}/gamesPlayed`);
    const targetUserLedStatsRef = ref(db, `leaderboard/${uid}`);
    const snapshot = await get(targetUserStatsRef);
    const snapshot_led = await get(targetUserLedStatsRef);
    if (snapshot.exists() && snapshot_led.exists()) {
      profileGamesPlayed.innerText = snapshot.val();
      profileHighestScore.innerText = snapshot_led.val().score;
      profileTimestamp.innerText = new Date(snapshot_led.val().timestamp).toLocaleString();
    } else {
      profileGamesPlayed.innerText = "0";
      profileHighestScore.innerText = "0";
      profileTimestamp.innerText = "Never played";
    }
  } catch (e) {
    console.error("Error fetching inspected profile stats: ", e);
    profileGamesPlayed.innerText = "Error loading count";
  }
}

profileCloseBtn.addEventListener("click", () => {
  if (previousScreenBeforeProfile) {
    blitScreen(previousScreenBeforeProfile);
  } else {
    blitScreen(startScreen);
  }
});


// --- AUTHENTICATION ACTIONS ---
authToggleLink.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  if (isSignUpMode) {
    authTitle.innerText = "Create Account";
    authDesc.innerHTML = 'on <b>MathsOnMyFoot</b> to play and score globally!';
    authUsername.classList.remove("hidden");
    forgotPasswordContainer.classList.add("hidden"); // Hide on sign up
    authSubmitBtn.innerText = "Sign Up";
    authToggleText.innerText = "Already have an account?";
    authToggleLink.innerText = "Login";
  } else {
    authTitle.innerText = "Welcome Back";
    authDesc.innerHTML = 'to <b>MathsOnMyFoot</b> &nbsp; ;)';
    authUsername.classList.add("hidden");
    forgotPasswordContainer.classList.remove("hidden"); // Show on login
    authSubmitBtn.innerText = "Log In";
    authToggleText.innerText = "Don't have an account?";
    authToggleLink.innerText = "Sign Up";
  }
});


authSubmitBtn.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const username = authUsername.value.trim();

  if (!email || !password) {
    alert("Please fill out email and password.");
    return;
  }

  try {
    if (isSignUpMode) {
      if (!username) {
        alert("Please pick a username.");
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, { displayName: username });
      window.location.reload();
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    alert(error.message);
  }
});


// Forgot Password Function for people with goldfish memory.. Lmao!!
authForgotLink.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  if (!email) {
    alert("Please type your account email address into the input field first, then click 'Forgot Password?");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    alert(`Password reset link successfully sent to: ${email}. Please check your inbox or spam folder!`);
  } catch (error) {
    alert(error.message);
  }
});

// LOG OUT MF!!
logoutBtn.addEventListener("click", () => signOut(auth));

// NAVIGATION & GENERAL ACTIONS
startBtn.addEventListener("click", runGameInit);
restartBtn.addEventListener("click", runGameInit);

exitBtn.addEventListener("click", () => {
  blitScreen(startScreen);
});

viewLeaderboardBtn.addEventListener("click", () => {
  blitScreen(viewLeaderboardScreen);
  fetchLeaderboard(standaloneLeaderboardList, viewLeaderboardScreen);
});

backToMenuBtn.addEventListener("click", () => blitScreen(startScreen));

function runGameInit() {
  blitScreen(gameScreen);
  score = 0;
  scoreVal.innerText = score;
  nextQuestion();
}

// --- The real robust Game Engine for MathsOnMyFoot by dwijottam ---
function gameENGINE() {
  let num1, num2, num3;
    let operator1, operator2;
    
    if (score <= 7) {
        // TIER 1: Warmup (Scores 0 to 7) -- Basic Addition/Subtraction, Single Digit Multiplication
        const ops = ['+', '-', '*'];
        operator1 = ops[Math.floor(Math.random() * ops.length)];
        
        if (operator1 === '+') {
            num1 = Math.floor(Math.random() * 15) + 3; // 3 to 17
            num2 = Math.floor(Math.random() * 15) + 3;
            currentAnswer = num1 + num2;
            equationDisplay.innerText = `${num1} + ${num2}`;
        } else if (operator1 === '-') {
            num1 = Math.floor(Math.random() * 20) + 10; // 10 to 29
            num2 = Math.floor(Math.random() * (num1 - 2)) + 1;
            currentAnswer = num1 - num2;
            equationDisplay.innerText = `${num1} - ${num2}`;
        } else {
            num1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
            num2 = Math.floor(Math.random() * 9) + 1;
            currentAnswer = num1 * num2;
            equationDisplay.innerText = `${num1} × ${num2}`;
        }
        
    } else if (score <= 22) {
        // TIER 2: Heat-Up (Scores 7 to 22) -- Larger Numbers, Division Joins, Triple-Digit Additions
        const ops = ['+', '-', '*', '/'];
        operator1 = ops[Math.floor(Math.random() * ops.length)];
        
        if (operator1 === '+') {
            num1 = Math.floor(Math.random() * 80) + 20; // 20 to 99
            num2 = Math.floor(Math.random() * 80) + 20;
            currentAnswer = num1 + num2;
            equationDisplay.innerText = `${num1} + ${num2}`;
        } else if (operator1 === '-') {
            num1 = Math.floor(Math.random() * 100) + 30;
            num2 = Math.floor(Math.random() * (num1 - 10)) + 5;
            currentAnswer = num1 - num2;
            equationDisplay.innerText = `${num1} - ${num2}`;
        } else if (operator1 === '*') {
            num1 = Math.floor(Math.random() * 11) + 4; // 4 to 14
            num2 = Math.floor(Math.random() * 11) + 3; // 3 to 13
            currentAnswer = num1 * num2;
            equationDisplay.innerText = `${num1} × ${num2}`;
        } else {
            // Divisor is kept between 2 and 6 (much easier to calculate mentally)
            num2 = Math.floor(Math.random() * 5) + 2; 

            // The actual answer is kept between 2 and 9
            currentAnswer = Math.floor(Math.random() * 8) + 2; 

            num1 = num2 * currentAnswer; // Perfectly divisible! (Max equation: 54 ÷ 6)
            equationDisplay.innerText = `${num1} ÷ ${num2}`;
        }
        
    } else if (score <= 35) {
        // TIER 3: The Wall (Scores 22 to 35) -- Serious Double Digit Multiplication, Complex Division, 3-Term Addition
        const subTiers = ['3term_add_sub', 'hard_mult', 'hard_div'];
        const chosenType = subTiers[Math.floor(Math.random() * subTiers.length)];
        
        if (chosenType === '3term_add_sub') {
            num1 = Math.floor(Math.random() * 50) + 10;
            num2 = Math.floor(Math.random() * 40) + 10;
            num3 = Math.floor(Math.random() * 30) + 5;
            
            operator1 = Math.random() < 0.5 ? '+' : '-';
            operator2 = Math.random() < 0.5 ? '+' : '-';
            
            let intermediate = operator1 === '+' ? num1 + num2 : num1 - num2;
            if (operator2 === '-' && intermediate < num3) {
                operator2 = '+';
            }
            currentAnswer = operator2 === '+' ? intermediate + num3 : intermediate - num3;
            equationDisplay.innerText = `${num1} ${operator1} ${num2} ${operator2} ${num3}`;
            
        } else if (chosenType === 'hard_mult') {
            num1 = Math.floor(Math.random() * 14) + 12; // 12 to 25
            num2 = Math.floor(Math.random() * 11) + 5;  // 5 to 15
            currentAnswer = num1 * num2;
            equationDisplay.innerText = `${num1} × ${num2}`;
            
        } else {
            num2 = Math.floor(Math.random() * 13) + 6; // Divisor: 6 to 18
            currentAnswer = Math.floor(Math.random() * 15) + 5; // Quotient: 5 to 19
            num1 = num2 * currentAnswer;
            equationDisplay.innerText = `${num1} ÷ ${num2}`;
        }
        
    } else {
        // TIER 4: Gods of Math (Scores 35+) -- Extremely hard operations, lightning fast combinations
        const subTiers = ['heavy_mult', '3term_mix', 'god_div'];
        const chosenType = subTiers[Math.floor(Math.random() * subTiers.length)];

        // YOU ARE A PRO PLAYER
        confetti.start();
        document.querySelector("footer").innerHTML = "Fabulous! Maths On Your Foot!! ;)";
        setTimeout(function () {
            confetti.stop();
            document.querySelector("footer").innerHTML = `Developed by <a href="https://dwijottam-dutta.github.io" style="color: #00dd6e; text-decoration: underline;" target="_blank">@dwijottam</a>`
        }, 5000);
        
        if (chosenType === 'heavy_mult') {
            num1 = Math.floor(Math.random() * 21) + 15; // 15 to 35
            num2 = Math.floor(Math.random() * 11) + 11; // 11 to 21
            currentAnswer = num1 * num2;
            equationDisplay.innerText = `${num1} × ${num2}`;
            
        } else if (chosenType === '3term_mix') {
            num1 = Math.floor(Math.random() * 10) + 4; // 4 to 13
            num2 = Math.floor(Math.random() * 8) + 3;  // 3 to 10
            num3 = Math.floor(Math.random() * 50) + 5;
            
            operator1 = Math.random() < 0.5 ? '+' : '-';
            let product = num1 * num2;
            
            if (operator1 === '-' && product < num3) {
                operator1 = '+';
            }
            currentAnswer = operator1 === '+' ? product + num3 : product - num3;
            equationDisplay.innerText = `(${num1} × ${num2}) ${operator1} ${num3}`;
            
        } else {
            num2 = Math.floor(Math.random() * 16) + 12; // Divisor: 12 to 27
            currentAnswer = Math.floor(Math.random() * 21) + 11; // Quotient: 11 to 31
            num1 = num2 * currentAnswer;
            equationDisplay.innerText = `${num1} ÷ ${num2}`;
        }
    }
}

function nextQuestion() {
  gameENGINE();
  generateOptions();
  resetTimer();
}

// --- OPTIONS GENERATION ---
function generateOptions() {
  const options = [currentAnswer];

  while (options.length < 4) {
    let offset;
    if (currentAnswer <= 10) {
      offset = Math.floor(Math.random() * 5) + 1;
    } else if (currentAnswer <= 50) {
      offset = Math.floor(Math.random() * 10) + 1;
    } else {
      offset = Math.floor(Math.random() * 20) + 1;
    }

    const fakeAnswer =
      Math.random() < 0.5 ? currentAnswer + offset : currentAnswer - offset;

    if (fakeAnswer >= 0 && !options.includes(fakeAnswer)) {
      options.push(fakeAnswer);
    }
  }

  options.sort(() => Math.random() - 0.5);

  optionsContainer.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.innerText = option;
    button.addEventListener("click", () => checkAnswer(option));
    optionsContainer.appendChild(button);
  });
}

function checkAnswer(selectedOption) {
  if (selectedOption === currentAnswer) {
    score++;
    scoreVal.innerText = score;
    nextQuestion();
  } else {
    clearInterval(timer);
    gameOver();
  }
}

// --- TIMER PIPELINE ---
function resetTimer() {
  clearInterval(timer);
    
    let adaptiveTimeLimit;

    if (score <= 22) {
        // Tiers 1 & 2
        adaptiveTimeLimit = 10.0;
    } else if (score <= 35) {
        // Tier 3
        adaptiveTimeLimit = 17.0; 
    } else {
        // Tier 4
        adaptiveTimeLimit = 22.0;
    }

    timeLeft = adaptiveTimeLimit;
    updateTimerUI(adaptiveTimeLimit);
    
    timer = setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            clearInterval(timer);
            gameOver();
        } else {
            updateTimerUI(adaptiveTimeLimit);
        }
    }, 100);
}

function updateTimerUI(maxLimit) {
  timerVal.innerText = `${Math.ceil(timeLeft)}s`;
  const percentage = (timeLeft / maxLimit) * 100;
  timerBar.style.width = `${percentage}%`;

  if (timeLeft <= 3) {
    timerBar.style.backgroundColor = "var(--danger)";
  } else {
    timerBar.style.backgroundColor = "var(--accent)";
  }
}

// --- END RUN & DATA OPERATIONS ---
async function gameOver() {
  blitScreen(leaderboardScreen);
  finalScore.innerText = score;

  if (currentUser) {
    try {
      const userStatsRef = ref(db, `users/${currentUser.uid}/gamesPlayed`);
      await runTransaction(userStatsRef, (currentValue) => {
        return (currentValue || 0) + 1;
      });
    } catch (e) {
      console.error("Error updating user statistics: ", e);
    }

    try {
        // We targeing 'leaderboard/USER_UID'
        const personalRecordRef = ref(db, `leaderboard/${currentUser.uid}`);
        const snapshot = await get(personalRecordRef);
            
        let shouldUpdate = true;
        if (snapshot.exists()) {
            const existingRecord = snapshot.val();
            // If their new score is less than or equal to their saved record, don't overwrite it
            if (score <= existingRecord.score) {
                shouldUpdate = false;
            }
        }

        if (shouldUpdate) {
            await set(personalRecordRef, {
                uid: currentUser.uid,
                name: currentUser.displayName || "Anonymous Player",
                score: score,
                timestamp: Date.now()
            });
        }
    } catch (e) {
        console.error("Error saving score: ", e);
    }
  }
  fetchLeaderboard(gameoverLeaderboardList, leaderboardScreen);
}


async function fetchLeaderboard(targetListElement, activeScreenElement) {
  targetListElement.innerHTML = "<li>Loading scores...</li>";
  congo();
  try {
    const leaderboardRef = ref(db, "leaderboard");
    const dbQuery = query(
      leaderboardRef,
      orderByChild("score")
    //   startAt(10),
    //   limitToLast(10),
    );
    const snapshot = await get(dbQuery);

    targetListElement.innerHTML = "";

    if (snapshot.exists()) {
      const rawData = [];
      snapshot.forEach((childSnapshot) => {
        rawData.push(childSnapshot.val());
      });
      rawData.reverse();

      let rank = 1;
      rawData.forEach((entry) => {
        const li = document.createElement("li");

        const nameSpan = document.createElement("span");
        nameSpan.className = "leaderboard-name-clickable";
        nameSpan.innerHTML = `#${rank} <b>${entry.name}</b>`;
        nameSpan.addEventListener("click", () =>
          openUserProfileCard(entry.uid, entry.name, activeScreenElement),
        );

        const scoreStrong = document.createElement("strong");
        scoreStrong.innerHTML = `<b>${entry.score}</b>`;

        li.appendChild(nameSpan);
        li.appendChild(scoreStrong);
        targetListElement.appendChild(li);
        rank++;
      });
    } else {
      targetListElement.innerHTML =
        "<li>$db is null</li>";
    }
  } catch (e) {
    console.error("Error retrieving leaderboard: ", e);
    targetListElement.innerHTML = "<li>Error loading leaderboard records.</li>";
  }
}



// This function will blit that screen which is passed in the arg**
function blitScreen(screenToShow) {
  authScreen.classList.add("hidden");
  startScreen.classList.add("hidden");
  viewLeaderboardScreen.classList.add("hidden");
  profileViewerScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  leaderboardScreen.classList.add("hidden");
  screenToShow.classList.remove("hidden");
}
