import { createApp } from 'vue'
import { VueCarousel } from 'vue-carousel'
import './style.css'
import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.css'
import bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js'


import router from './router';
import './assets/tailwind.css'


import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import { createPinia } from 'pinia';


const app = createApp(App);
app.use(bootstrap);
app.use(router);
app.use(VueCarousel);
app.use(createPinia());
app.use(ElementPlus);
app.mount('#app');
