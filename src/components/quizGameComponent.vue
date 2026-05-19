<template>
  <div class="h-screen w-screen flex justify-center bg-gradient-to-r from-blue-100 to-purple-100 px-4 relative">

    <!-- Game Icon -->
    <div class="absolute top-4 left-4">
      <img src="/trivia.png" alt="Game Icon" class="w-12 h-12" />
    </div>

    <!-- Main Content -->
    <div class="w-full flex flex-col items-center relative mt-20 pb-20">

      <!-- LOADING -->
      <div v-if="isLoading" class="text-center text-xl font-semibold mt-20">
        ⏳ Loading Quiz...
      </div>

      <!-- GAME UI -->
      <template v-else-if="questions.length && currentQuestion < questions.length">

        <!-- Clue -->
        <div class="p-6 rounded-xl w-full max-w-lg text-center">
          <div class="text-lg font-semibold text-gray-800 break-words" v-html="questions[currentQuestion]"></div>

          <p v-if="feedback" class="mt-4 text-md font-bold" :class="isCorrect ? 'text-green-600' : 'text-red-600'">
            {{ feedback }}
          </p>
        </div>

        <!-- Divider -->
        <div class="w-full max-w-6xl px-4 border-t-2 border-gray-500 my-10"></div>

        <!-- Answer Area -->
        <div class="p-6 w-full max-w-lg flex flex-col items-center" @click="handleFirstInteraction">

          <div class="flex flex-col gap-2 w-full px-2 py-2">
            <template v-for="(groupLength, groupIndex) in answerDetails" :key="groupIndex">
              <div class="flex justify-center gap-1">
                <template v-for="n in groupLength" :key="`${groupIndex}-${n}`">
                  <div class="w-6 h-8 border-b border-gray-500 text-center">
                    <input v-model="userAnswers[currentQuestion][groupOffsets[groupIndex] + n - 1]" maxlength="1"
                      ref="answerInputs"
                      class="w-full h-full text-center bg-transparent font-semibold text-sm focus:outline-none"
                      @input="handleInput(groupOffsets[groupIndex] + n - 1, $event)"
                      @keydown.backspace="clearAnswer(groupOffsets[groupIndex] + n - 1, $event)"
                      :disabled="isSubmitting || isGameCompleted" />
                  </div>
                </template>
              </div>
            </template>
          </div>

          <!-- Navigation -->
          <div class="flex justify-between mt-6 w-full">
            <button @click="prevQuestion" :disabled="currentQuestion === 0"
              class="px-4 py-2 bg-gray-300 rounded-lg disabled:opacity-50">
              Prev
            </button>

            <button @click="nextQuestion" :disabled="currentQuestion >= questions.length - 1"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50">
              Next
            </button>
          </div>

        </div>
      </template>

      <!-- COMPLETED -->
      <div v-else class="text-center mt-20">
        <p class="text-xl font-semibold">🎉 Quiz Completed! 🎉</p>

        <button @click="resetQuiz" class="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg">
          Restart
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import axios from "axios";

/* STATE */
const isLoading = ref(true);
const hasFetchedTrivia = ref(false);
const isSubmitting = ref(false);
const hasUserInteracted = ref(false);
const isGameCompleted = ref(false);

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

const isFirstLoad = ref(true);
const maxQuestionReached = ref(0);

/* STORAGE KEY */
const getCompletedKey = () => {
  return `trivia_completed_${quizId.value}`;
};

/* TIMER */
const startTimer = () => {
  const key = `trivia_start_time_${quizId.value}`;
  const stored = localStorage.getItem(key);

  startTime.value = stored ? parseInt(stored) : Date.now();
  localStorage.setItem(key, startTime.value);

  timerInterval = setInterval(() => {
    elapsedSeconds.value = Math.floor(
      (Date.now() - startTime.value) / 1000
    );
  }, 1000);
};

/* URL PARAMS */
const extractParams = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    quiz: params.get("quiz"),
  };
};

/* INIT */
onMounted(async () => {
  const params = extractParams();

  quizId.value = params.quiz;

  /* TAKE FROM LOCALSTORAGE */
  userId.value = localStorage.getItem("userId");
  gameId.value = localStorage.getItem("gameId");

  if (!quizId.value) {
    isLoading.value = false;
    return;
  }

  isGameCompleted.value =
    localStorage.getItem(getCompletedKey()) === "true";

  await fetchTriviaData();

  if (!isGameCompleted.value) {
    startTimer();
  }

  nextTick(() => {
    isFirstLoad.value = false;
  });
});

/* HELPERS */
const getTotalLength = (arr) =>
  arr.reduce((a, b) => a + b, 0);

const calculateOffsets = () => {
  let sum = 0;

  groupOffsets.value = answerDetails.value.map((len) => {
    const offset = sum;
    sum += len;
    return offset;
  });
};

/* FETCH */
const fetchTriviaData = async () => {
  if (hasFetchedTrivia.value && questions.value.length) return;

  try {
    const res = await axios.get(
      "https://aqada.online/gameplays/trivia/get-clues",
      { params: { quiz: quizId.value } }
    );

    const data = res.data?.data || res.data;

    questions.value = data?.clues || [];
    answerDetails.value = data?.answer_details || [];

    const total = getTotalLength(answerDetails.value);

    userAnswers.value = questions.value.map(() =>
      Array(total).fill("")
    );

    calculateOffsets();
    hasFetchedTrivia.value = true;

  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

/* INPUT */
const handleInput = (index, e) => {
  if (isSubmitting.value || isGameCompleted.value) return;

  userAnswers.value[currentQuestion.value][index] =
    e.target.value.slice(0, 1);

  if (
    index <
    userAnswers.value[currentQuestion.value].length - 1
  ) {
    nextTick(() =>
      answerInputs.value[index + 1]?.focus()
    );
  }

  autoSubmit();
};

const clearAnswer = (index, e) => {
  e.preventDefault();

  if (
    userAnswers.value[currentQuestion.value][index]
  ) {
    userAnswers.value[currentQuestion.value][index] = "";
    return;
  }

  if (index > 0) {
    userAnswers.value[currentQuestion.value][index - 1] = "";

    nextTick(() =>
      answerInputs.value[index - 1]?.focus()
    );
  }
};

/* SUBMIT */
const autoSubmit = async () => {
  const input =
    userAnswers.value[currentQuestion.value];

  if (input.some((c) => !c.trim())) return;

  isSubmitting.value = true;

  let answer = "";
  let i = 0;

  for (let len of answerDetails.value) {
    answer +=
      input.slice(i, i + len).join("") + " ";
    i += len;
  }

  try {
    const res = await axios.post(
      "https://aqada.online/gameplays/trivia/validate-answer",
      new URLSearchParams({
        quiz: quizId.value,
        answer: answer.trim(),
      })
    );

    isCorrect.value =
      res.data?.trim().toUpperCase() === "OK";

    feedback.value = isCorrect.value
      ? "🎉 Correct!"
      : "❌ Wrong!";

    if (isCorrect.value) {
      await completeGame();
    }

  } catch (err) {
    console.error(err);
  }

  setTimeout(() => {
    feedback.value = "";
    isSubmitting.value = false;

    if (!isCorrect.value) {
      userAnswers.value[currentQuestion.value] =
        userAnswers.value[currentQuestion.value].map(
          () => ""
        );
    }

    isCorrect.value = false;
  }, 2000);
};

/* COMPLETE GAME */
const completeGame = async () => {
  try {
    const form = new URLSearchParams();

    form.append("game_id", gameId.value || "");
    form.append("user", userId.value || "");

    form.append(
      "params",
      JSON.stringify({
        question_no: maxQuestionReached.value + 1,
        seconds: elapsedSeconds.value,
      })
    );

    const res = await axios.post(
      "https://aqada.online/games/game-completed",
      form
    );

    if (res.data === "OK" || res.status === 200) {
      isGameCompleted.value = true;

      localStorage.setItem(
        getCompletedKey(),
        "true"
      );

      /* =====================================
      ✅ ADD THIS NEW BLOCK
      send completed game id to parent
      ===================================== */
      localStorage.setItem(
        "completed_game_id",
        gameId.value
      );

      clearInterval(timerInterval);

      localStorage.removeItem(
        `trivia_start_time_${quizId.value}`
      );
    }

  } catch (err) {
    console.error(err);
  }
};

/* NAV */
const nextQuestion = () => {
  currentQuestion.value++;

  if (
    currentQuestion.value >
    maxQuestionReached.value
  ) {
    maxQuestionReached.value =
      currentQuestion.value;
  }
};

const prevQuestion = () => {
  currentQuestion.value--;
};

/* RESET */
const resetQuiz = () => {
  currentQuestion.value = 0;
  feedback.value = "";

  const total = getTotalLength(
    answerDetails.value
  );

  userAnswers.value = questions.value.map(() =>
    Array(total).fill("")
  );

  if (!isGameCompleted.value) {
    startTimer();
  }
};

/* UX */
const handleFirstInteraction = () => {
  if (hasUserInteracted.value) return;

  hasUserInteracted.value = true;
};

/* WATCH */
watch(currentQuestion, (newVal) => {
  feedback.value = "";
  isCorrect.value = false;

  if (newVal > maxQuestionReached.value) {
    maxQuestionReached.value = newVal;
  }
});
</script>