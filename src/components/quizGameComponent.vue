<template>
  <div class="h-screen w-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100 px-4">
    <div class="p-8 rounded-xl w-full max-w-lg flex flex-col items-center">
      <h2 class="text-3xl font-bold text-blue-700 text-center mb-6">Quiz Game</h2>

      <div v-if="currentQuestion < questions.length" class="w-full">
        <div class="flex flex-wrap justify-center gap-1 w-full px-2 py-2">
          <template v-for="(groupLength, groupIndex) in answerDetails" :key="groupIndex">
            <template v-for="n in groupLength" :key="`${groupIndex}-${n}`">
              <div class="w-6 h-8 border-b border-gray-400 text-center">
                <input v-model="userAnswers[currentQuestion][groupOffsets[groupIndex] + n - 1]" maxlength="1"
                  class="w-full h-full text-center bg-transparent text-gray-900 font-semibold text-sm border-none focus:outline-none"
                  @input="handleInput(groupOffsets[groupIndex] + n - 1, $event)"
                  @keydown.backspace="clearAnswer(groupOffsets[groupIndex] + n - 1, $event)" ref="answerInputs" />
              </div>
            </template>
            <div v-if="groupIndex < answerDetails.length - 1" class="w-3"></div>
          </template>
        </div>

        <!-- Clue -->
        <p class="text-lg font-semibold mb-4 text-center text-gray-800 pt-4 break-words">
          Clue: {{ questions[currentQuestion] }}
        </p>

        <!-- Feedback -->
        <p v-if="feedback" class="mt-3 text-md font-bold text-center"
          :class="{ 'text-green-600': isCorrect, 'text-red-600': !isCorrect }">
          {{ feedback }}
        </p>

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
          'http://147.93.106.108:5100/gameplays/trivia/get-clues?quiz=680e7a791126b7cd7559a7ee'
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
          'http://147.93.106.108:5100/gameplays/trivia/validate-answer',
          params,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            responseType: 'text',
          }
        );

        const responseText = (res.data || '').trim();
        this.feedback = responseText;
        this.isCorrect = responseText.toUpperCase() === 'OK';

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