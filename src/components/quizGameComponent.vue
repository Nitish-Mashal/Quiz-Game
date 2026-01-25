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
      </div>

      <!-- Divider -->
      <div class="w-full max-w-6xl px-4 border-t-2 border-gray-500 my-10"></div>

      <!-- Answer Area -->
      <div class="p-6 w-full max-w-lg flex flex-col items-center">
        <div v-if="questions.length && currentQuestion < questions.length" class="w-full">
          <div class="flex flex-col gap-2 w-full px-2 py-2">
            <template v-for="(groupLength, groupIndex) in answerDetails" :key="groupIndex">
              <div class="flex justify-center gap-1">
                <template v-for="n in groupLength" :key="`${groupIndex}-${n}`">
                  <div class="w-6 h-8 border-b border-gray-500 text-center">
                    <input v-model="userAnswers[currentQuestion][
                      groupOffsets[groupIndex] + n - 1
                      ]
                      " maxlength="1" ref="answerInputs"
                      class="w-full h-full text-center bg-transparent text-gray-900 font-semibold text-sm border-none focus:outline-none"
                      @input="
                        handleInput(groupOffsets[groupIndex] + n - 1, $event)
                        " @keydown.backspace="
                        clearAnswer(
                          groupOffsets[groupIndex] + n - 1,
                          $event
                        )
                        " />
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

          <!-- Feedback -->
          <p v-if="feedback" class="mt-20 text-md font-bold text-center" :class="{
            'text-green-600': isCorrect,
            'text-red-600': !isCorrect,
          }">
            {{ feedback }}
          </p>
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

<script>
import axios from "axios";

export default {
  data() {
    return {
      currentQuestion: 0,
      questions: [],
      answerDetails: [],
      userAnswers: [],
      groupOffsets: [],
      feedback: "",
      isCorrect: false,
    };
  },

  watch: {
    "$route.query.quiz": {
      immediate: true,
      handler(quiz) {
        if (quiz) {
          this.fetchTriviaData();
        }
      },
    },

    currentQuestion() {
      this.feedback = "";
      this.isCorrect = false;

      const total = this.getTotalLength(this.answerDetails);
      if (!this.userAnswers[this.currentQuestion]) {
        this.userAnswers[this.currentQuestion] = Array(total).fill("");
      }

      this.calculateGroupOffsets();
      this.focusFirstInput();
    },
  },

  methods: {
    /* -------------------------------
       FETCH TRIVIA DATA
    --------------------------------*/
    async fetchTriviaData() {
      try {
        const quizId = this.$route.query.quiz;
        if (!quizId) return;

        const res = await axios.get(
          "https://aqada.online/gameplays/trivia/get-clues",
          { params: { quiz: quizId } }
        );

        this.questions = res.data?.clues || [];
        this.answerDetails = res.data?.answer_details || [];

        const total = this.getTotalLength(this.answerDetails);
        this.userAnswers = this.questions.map(() =>
          Array(total).fill("")
        );

        this.calculateGroupOffsets();
        this.focusFirstInput();
      } catch (err) {
        console.error("Error fetching trivia data:", err);
      }
    },

    calculateGroupOffsets() {
      let sum = 0;
      this.groupOffsets = this.answerDetails.map((len) => {
        const offset = sum;
        sum += len;
        return offset;
      });
    },

    getTotalLength(details) {
      return details.reduce((sum, v) => sum + v, 0);
    },

    handleInput(index, event) {
      this.userAnswers[this.currentQuestion][index] =
        event.target.value.slice(0, 1);
      this.moveToNext(index);
    },

    moveToNext(index) {
      if (index < this.userAnswers[this.currentQuestion].length - 1) {
        this.$nextTick(() => {
          this.$refs.answerInputs?.[index + 1]?.focus();
        });
      }
      this.autoSubmit();
    },

    clearAnswer(index, event) {
      event.preventDefault();

      if (this.userAnswers[this.currentQuestion][index]) {
        this.userAnswers[this.currentQuestion][index] = "";
        return;
      }

      const prev = index - 1;
      if (prev >= 0) {
        this.userAnswers[this.currentQuestion][prev] = "";
        this.$nextTick(() => {
          this.$refs.answerInputs?.[prev]?.focus();
        });
      }
    },

    /* -------------------------------
       AUTO SUBMIT
    --------------------------------*/
    async autoSubmit() {
      const input = this.userAnswers[this.currentQuestion];
      if (input.some((c) => c.trim() === "")) return;

      let answer = "";
      let idx = 0;

      for (let len of this.answerDetails) {
        answer += input.slice(idx, idx + len).join("") + " ";
        idx += len;
      }

      try {
        const params = new URLSearchParams();
        params.append("quiz", this.$route.query.quiz);
        params.append("answer", answer.trim());

        const res = await axios.post(
          "https://aqada.online/gameplays/trivia/validate-answer",
          params,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        this.isCorrect = res.data?.trim().toUpperCase() === "OK";
        this.feedback = this.isCorrect
          ? "🎉 Correct Answer!"
          : "❌ Wrong Answer!";

        setTimeout(() => {
          this.feedback = "";
          this.isCorrect = false;
          this.userAnswers[this.currentQuestion].fill("");
          this.focusFirstInput();
        }, 2500);
      } catch (err) {
        console.error(err);
        this.feedback = "⚠️ Server error";
      }
    },

    nextQuestion() {
      if (this.currentQuestion < this.questions.length - 1) {
        this.currentQuestion++;
      }
    },

    prevQuestion() {
      if (this.currentQuestion > 0) {
        this.currentQuestion--;
      }
    },

    resetQuiz() {
      this.currentQuestion = 0;
      this.feedback = "";
      this.isCorrect = false;

      const total = this.getTotalLength(this.answerDetails);
      this.userAnswers = this.questions.map(() =>
        Array(total).fill("")
      );

      this.focusFirstInput();
    },

    focusFirstInput() {
      this.$nextTick(() => {
        this.$refs.answerInputs?.[0]?.focus();
      });
    },
  },

  mounted() {
    this.$router.isReady().then(() => {
      if (this.$route.query.quiz) {
        this.fetchTriviaData();
      }
    });
  },
};
</script>

<style scoped>
input:disabled {
  background-color: transparent;
  color: #bbb;
}
</style>
