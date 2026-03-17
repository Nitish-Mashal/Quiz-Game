<template>
  <div class="h-screen w-screen flex justify-center bg-gradient-to-r from-blue-100 to-purple-100 px-4 relative">
    <!-- Game Icon -->
    <div class="absolute top-4 left-4">
      <img src="/trivia.png" alt="Game Icon" class="w-12 h-12" />
    </div>

    <!-- Main Content -->
    <div class="w-full flex flex-col items-center relative mt-20">
      <!-- Clue -->
      <div class="p-6 rounded-xl w-full max-w-lg text-center">
        <div class="text-lg font-semibold text-gray-800 break-words">
          {{ questions[currentQuestion] || "" }}
        </div>

        <!-- Feedback -->
        <p v-if="feedback" class="mt-4 text-md font-bold text-center"
          :class="isCorrect ? 'text-green-600' : 'text-red-600'">
          {{ feedback }}
        </p>
      </div>

      <!-- Divider -->
      <div class="w-full max-w-6xl px-4 border-t-2 border-gray-500 my-10"></div>

      <!-- Answer Area -->
      <div class="p-6 w-full max-w-lg flex flex-col items-center" @click="handleFirstInteraction">
        <div v-if="questions.length && currentQuestion < questions.length" class="w-full">
          <div class="flex flex-col gap-2 w-full px-2 py-2">
            <template v-for="(groupLength, groupIndex) in answerDetails" :key="groupIndex">
              <div class="flex justify-center gap-1">
                <template v-for="n in groupLength" :key="`${groupIndex}-${n}`">
                  <div class="w-6 h-8 border-b border-gray-500 text-center">
                    <input v-model="userAnswers[currentQuestion][groupOffsets[groupIndex] + n - 1]" maxlength="1"
                      ref="answerInputs"
                      class="w-full h-full text-center bg-transparent text-gray-900 font-semibold text-sm border-none focus:outline-none"
                      @input="handleInput(groupOffsets[groupIndex] + n - 1, $event)"
                      @keydown.backspace="clearAnswer(groupOffsets[groupIndex] + n - 1, $event)"
                      :disabled="isSubmitting" />
                  </div>
                </template>
              </div>
            </template>
          </div>

          <!-- Navigation -->
          <div class="flex justify-between mt-6 w-full">
            <button @click="prevQuestion" :disabled="currentQuestion === 0"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50">
              Prev
            </button>

            <button @click="nextQuestion" :disabled="currentQuestion >= questions.length - 1"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
              Next
            </button>
          </div>
        </div>

        <!-- Quiz End -->
        <div v-else class="text-center">
          <p class="text-xl font-semibold text-gray-800">
            🎉 Quiz Completed! 🎉
          </p>
          <button @click="resetQuiz" class="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg">
            Restart
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";

/* ✅ Extract URL parameters - SIMPLE AND DIRECT */
const extractUrlParams = () => {
  const params = new URLSearchParams(window.location.search);

  const quiz = params.get("quiz");
  const user = params.get("user");
  const game_id = params.get("game_id");

  console.log("✅ URL Parameters extracted:");
  console.log("   QUIZ ID:", quiz);
  console.log("   USER ID:", user);
  console.log("   GAME ID:", game_id);
  console.log("   Full URL:", window.location.href);

  return { quiz, user, game_id };
};

/* STATE */
const hasFetchedTrivia = ref(false);
const isSubmitting = ref(false);
const hasUserInteracted = ref(false);

const currentQuestion = ref(0);
const questions = ref([]);
const answerDetails = ref([]);
const userAnswers = ref([]);
const groupOffsets = ref([]);

const feedback = ref("");
const isCorrect = ref(false);
const answerInputs = ref([]);

const userId = ref(null);
const gameId = ref(null);
const quizId = ref(null);

/* TIMER */
const startTime = ref(null);
const elapsedSeconds = ref(0);
let timerInterval = null;

const startTimer = () => {
  const storageKey = `trivia_start_time_${quizId.value}`;
  const storedStart = localStorage.getItem(storageKey);

  if (storedStart) {
    startTime.value = parseInt(storedStart);
  } else {
    startTime.value = Date.now();
    localStorage.setItem(storageKey, startTime.value);
  }

  timerInterval = setInterval(() => {
    elapsedSeconds.value = Math.floor(
      (Date.now() - startTime.value) / 1000
    );
  }, 1000);
};

/* MOUNT */
onMounted(async () => {
  await router.isReady();

  // ✅ Extract parameters from URL
  const params = extractUrlParams();

  quizId.value = params.quiz;
  userId.value = params.user;
  gameId.value = params.game_id;

  // ✅ Validate required params
  if (!quizId.value) {
    console.error("❌ Quiz ID is required but missing from URL");
    return;
  }

  if (!userId.value) {
    console.error("❌ User ID is required but missing from URL");
    console.log("⚠️ Make sure gameArea.vue passes ?user=USERID in the URL");
    return;
  }

  console.log("✅ Quiz initialized with:", { 
    quizId: quizId.value, 
    userId: userId.value,
    gameId: gameId.value
  });

  // ✅ Load trivia data and start timer
  await fetchTriviaData();
  startTimer();
});

/* HELPERS */
const getTotalLength = (details) =>
  details.reduce((sum, v) => sum + v, 0);

const calculateGroupOffsets = () => {
  let sum = 0;

  groupOffsets.value = answerDetails.value.map((len) => {
    const offset = sum;
    sum += len;
    return offset;
  });
};

const focusFirstInput = () => {
  nextTick(() => {
    answerInputs.value?.[0]?.focus();
  });
};

/* API */
const fetchTriviaData = async () => {
  if (hasFetchedTrivia.value) return;
  if (!quizId.value) {
    console.error("❌ Quiz ID is missing");
    return;
  }

  hasFetchedTrivia.value = true;

  try {
    const res = await axios.get(
      "https://aqada.online/gameplays/trivia/get-clues",
      { params: { quiz: quizId.value } }
    );

    questions.value = res.data?.clues || [];
    answerDetails.value = res.data?.answer_details || [];

    const total = getTotalLength(answerDetails.value);

    userAnswers.value = questions.value.map(() =>
      Array(total).fill("")
    );

    calculateGroupOffsets();
    console.log("✅ Trivia data loaded successfully");

  } catch (err) {
    console.error("❌ Fetch trivia error:", err);
  }
};

/* INPUT LOGIC */
const handleInput = (index, event) => {
  if (isSubmitting.value) return;

  userAnswers.value[currentQuestion.value][index] =
    event.target.value.slice(0, 1);

  moveToNext(index);
};

const moveToNext = (index) => {
  if (index < userAnswers.value[currentQuestion.value].length - 1) {
    nextTick(() => {
      answerInputs.value?.[index + 1]?.focus();
    });
  }

  autoSubmit();
};

const clearAnswer = (index, event) => {
  event.preventDefault();

  if (isSubmitting.value) return;

  if (userAnswers.value[currentQuestion.value][index]) {
    userAnswers.value[currentQuestion.value][index] = "";
    return;
  }

  const prev = index - 1;

  if (prev >= 0) {
    userAnswers.value[currentQuestion.value][prev] = "";

    nextTick(() => {
      answerInputs.value?.[prev]?.focus();
    });
  }
};

/* HIGHEST CLUE LOGIC */
const updateHighestClue = () => {
  const key = `trivia_max_${quizId.value}`;
  let highest = parseInt(localStorage.getItem(key) || 0);
  highest = Math.max(highest, currentQuestion.value + 1);
  localStorage.setItem(key, highest);
  return highest;
};

/* SUBMIT WITH USERID */
const autoSubmit = async () => {
  const input = userAnswers.value[currentQuestion.value];

  if (input.some((c) => c.trim() === "")) return;

  isSubmitting.value = true;

  let answer = "";
  let idx = 0;

  for (let len of answerDetails.value) {
    answer += input.slice(idx, idx + len).join("") + " ";
    idx += len;
  }

  try {
    const params = new URLSearchParams();
    params.append("quiz", quizId.value);
    params.append("answer", answer.trim());

    const res = await axios.post(
      "https://aqada.online/gameplays/trivia/validate-answer",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    isCorrect.value = res.data?.trim().toUpperCase() === "OK";

    feedback.value = isCorrect.value
      ? "🎉 Correct Answer!"
      : "❌ Wrong Answer!";

    /* GAME COMPLETED */
    if (isCorrect.value) {
      try {
        const highestClue = updateHighestClue();

        const formData = new URLSearchParams();
        formData.append("game_id", gameId.value || quizId.value);

        // ✅ Include userId
        if (userId.value) {
          formData.append("user", userId.value);
          console.log("✅ userId included in game-completed API:", userId.value);
        } else {
          console.error("❌ CRITICAL: userId is missing!");
        }

        formData.append(
          "params",
          JSON.stringify({
            question_no: highestClue,
            seconds: elapsedSeconds.value
          })
        );

        console.log("✅ Game Completed:", {
          game_id: gameId.value || quizId.value,
          user: userId.value,
          question_no: highestClue,
          seconds: elapsedSeconds.value
        });

        await axios.post(
          "https://aqada.online/games/game-completed",
          formData,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        console.log("✅ Game completed API call successful with userId!");

        clearInterval(timerInterval);
        localStorage.removeItem(`trivia_start_time_${quizId.value}`);

      } catch (err) {
        console.error("❌ Game completed API error:", err);
      }
    }

    setTimeout(() => {
      feedback.value = "";

      if (!isCorrect.value) {
        userAnswers.value[currentQuestion.value] =
          userAnswers.value[currentQuestion.value].map(() => "");
      }

      isCorrect.value = false;
      isSubmitting.value = false;

      if (hasUserInteracted.value) {
        focusFirstInput();
      }

    }, 2500);

  } catch (err) {
    console.error(err);
    isSubmitting.value = false;
  }
};

/* NAVIGATION */
const nextQuestion = () => {
  if (currentQuestion.value < questions.value.length - 1) {
    currentQuestion.value++;
  }
};

const prevQuestion = () => {
  if (currentQuestion.value > 0) {
    currentQuestion.value--;
  }
};

const resetQuiz = () => {
  currentQuestion.value = 0;
  feedback.value = "";
  isCorrect.value = false;

  const total = getTotalLength(answerDetails.value);
  userAnswers.value = questions.value.map(() => Array(total).fill(""));

  localStorage.removeItem(`trivia_start_time_${quizId.value}`);

  startTimer();
};

/* USER INTERACTION */
const handleFirstInteraction = () => {
  if (hasUserInteracted.value) return;
  hasUserInteracted.value = true;
  focusFirstInput();
};

/* WATCHERS */
watch(currentQuestion, () => {
  feedback.value = "";
  isCorrect.value = false;

  const total = getTotalLength(answerDetails.value);

  if (!userAnswers.value[currentQuestion.value]) {
    userAnswers.value[currentQuestion.value] = Array(total).fill("");
  }

  calculateGroupOffsets();
});

// ✅ Add missing imports
const route = useRoute();
const router = useRouter();

</script>

<style scoped>
input:disabled {
  background-color: transparent;
  color: #bbb;
}
</style>