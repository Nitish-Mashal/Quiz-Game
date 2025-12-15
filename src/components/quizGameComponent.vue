<template>
  <div
    class="h-screen w-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100 px-4 relative">

    <!-- Game Icon (fixed top-left) -->
    <div class="absolute top-4 left-4">
      <img src="/trivia.png" alt="Game Icon" class="w-12 h-12">
    </div>

    <!-- Main Container -->
    <div class="p-8 rounded-xl w-full max-w-lg flex flex-col items-center">
      <!-- Clue -->
      <div class="text-lg font-semibold text-gray-800 text-center mt-2 mb-3 break-words">
        {{ questions[currentQuestion] }}
      </div>

      <!-- Separator -->
      <div class="w-full border-t border-gray-400 my-3"></div>

      <div v-if="currentQuestion < questions.length" class="w-full">
        <div class="flex flex-col gap-2 w-full px-2 py-2">
          <template v-for="(groupLength, groupIndex) in answerDetails" :key="groupIndex">
            <!-- Each word is a row -->
            <div class="flex justify-center gap-1">
              <template v-for="n in groupLength" :key="`${groupIndex}-${n}`">
                <div class="w-6 h-8 border-b border-gray-400 text-center">
                  <input v-model="userAnswers[currentQuestion][groupOffsets[groupIndex] + n - 1]" maxlength="1"
                    class="w-full h-full text-center bg-transparent text-gray-900 font-semibold text-sm border-none focus:outline-none"
                    @input="handleInput(groupOffsets[groupIndex] + n - 1, $event)"
                    @keydown.backspace="clearAnswer(groupOffsets[groupIndex] + n - 1, $event)" ref="answerInputs" />
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- Navigation -->
        <div class="flex justify-between mt-6 w-full">
          <button @click="prevQuestion" :disabled="currentQuestion === 0"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50">
            Prev
          </button>
          <button @click="nextQuestion" :disabled="currentQuestion >= questions.length - 1"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
            Next
          </button>
        </div>

        <!-- Feedback -->
        <p v-if="feedback" class="mt-3 text-md font-bold text-center"
          :class="{ 'text-green-600': isCorrect, 'text-red-600': !isCorrect }">
          {{ feedback }}
        </p>
      </div>


      <div v-else class="text-center">
        <p class="text-xl font-semibold text-gray-800">🎉 Quiz Completed! 🎉</p>
        <button @click="resetQuiz"
          class="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-green-600">
          Restart
        </button>
      </div>
    </div>
  </div>

</template>

<script>
import axios from 'axios';
import confetti from "canvas-confetti";

export default {
  data() {
    return {
      currentQuestion: 0,
      questions: [],
      userAnswers: [],
      answerDetails: [],
      feedback: '',
      isCorrect: false,
      groupOffsets: [],
    };
  },
  watch: {
    currentQuestion() {
      this.feedback = '';
      this.isCorrect = false;

      const total = this.getTotalLength(this.answerDetails);
      if (!this.userAnswers[this.currentQuestion]) {
        this.userAnswers[this.currentQuestion] = Array(total).fill('');
      }

      this.calculateGroupOffsets();
      this.focusFirstInput();
    },
  },
  methods: {
    async fetchTriviaData() {
      try {
        const res = await axios.get(
          'https://aqada.online/gameplays/trivia/get-clues?quiz=680e7a791126b7cd7559a7ee'
        );

        this.questions = res.data.clues || [];
        this.answerDetails = res.data.answer_details || [];

        const total = this.getTotalLength(this.answerDetails);
        this.userAnswers = this.questions.map(() => Array(total).fill(''));

        this.calculateGroupOffsets();
        this.focusFirstInput();
      } catch (error) {
        console.error('Error fetching quiz data:', error);
      }
    },

    calculateGroupOffsets() {
      const offsets = [];
      let sum = 0;
      for (let len of this.answerDetails) {
        offsets.push(sum);
        sum += len;
      }
      this.groupOffsets = offsets;
    },

    getTotalLength(details) {
      return details.reduce((sum, val) => sum + val, 0);
    },

    handleInput(index, event) {
      const val = event.target.value.slice(0, 1);
      this.userAnswers[this.currentQuestion][index] = val;
      this.moveToNext(index);
    },

    moveToNext(index) {
      const inputs = this.userAnswers[this.currentQuestion];
      if (index < inputs.length - 1) {
        this.$nextTick(() => {
          this.$refs.answerInputs?.[index + 1]?.focus();
        });
      }
      this.autoSubmit();
    },

    clearAnswer(index, event) {
      event.preventDefault();
      if (this.userAnswers[this.currentQuestion][index]) {
        this.userAnswers[this.currentQuestion][index] = '';
        return;
      }

      const prev = index - 1;
      if (prev >= 0) {
        this.userAnswers[this.currentQuestion][prev] = '';
        this.$nextTick(() => {
          this.$refs.answerInputs?.[prev]?.focus();
        });
      }
    },

    async autoSubmit() {
      const input = this.userAnswers[this.currentQuestion];
      if (input.some(char => char.trim() === '')) return;

      // Format input as group-wise words
      let formattedAnswer = '';
      let index = 0;

      for (let i = 0; i < this.answerDetails.length; i++) {
        const length = this.answerDetails[i];
        const word = input.slice(index, index + length).join('');
        formattedAnswer += word;
        if (i < this.answerDetails.length - 1) {
          formattedAnswer += ' ';
        }
        index += length;
      }

      try {
        const params = new URLSearchParams();
        params.append('quiz', '680e7a791126b7cd7559a7ee');
        params.append('answer', formattedAnswer.trim());

        const res = await axios.post(
          'https://aqada.online/gameplays/trivia/validate-answer',
          params,
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            responseType: 'text',
          }
        );

        const responseText = (res.data || '').trim();

        if (responseText.toUpperCase() === "OK") {
          this.feedback = "🎉 Correct Answer!";
          this.isCorrect = true;

          // Trigger confetti
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
          });

          // Hide message and reset inputs after 3 sec
          setTimeout(() => {
            this.feedback = "";
            this.isCorrect = false;

            // clear input fields for current question
            const total = this.getTotalLength(this.answerDetails);
            this.userAnswers[this.currentQuestion] = Array(total).fill("");

            this.focusFirstInput();
          }, 3000);

        } else if (responseText.toUpperCase() === "NOK") {
          this.feedback = "❌ Wrong Answer!";
          this.isCorrect = false;

          // Hide message and reset inputs after 3 sec
          setTimeout(() => {
            this.feedback = "";
            this.isCorrect = false;

            // clear input fields for current question
            const total = this.getTotalLength(this.answerDetails);
            this.userAnswers[this.currentQuestion] = Array(total).fill("");

            this.focusFirstInput();
          }, 3000);
        } else {
          this.feedback = responseText; // fallback
          this.isCorrect = false;
        }

      } catch (error) {
        console.error('Error validating answer:', error);
        this.feedback = '⚠️ Server error. Please try again.';
        this.isCorrect = false;
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
      this.feedback = '';
      this.isCorrect = false;
      const total = this.getTotalLength(this.answerDetails);
      this.userAnswers = this.questions.map(() => Array(total).fill(''));
      this.calculateGroupOffsets();
      this.focusFirstInput();
    },

    focusFirstInput() {
      this.$nextTick(() => {
        const first = this.$refs.answerInputs?.[0];
        if (first) first.focus();
      });
    },
  },
  mounted() {
    this.fetchTriviaData();
  },
};
</script>

<style scoped>
input:disabled {
  background-color: transparent;
  color: #bbb;
}
</style>