import { createRouter, createWebHistory } from 'vue-router';
// import CardDetails from './components/CardDetails.vue';
// import Home from './components/Home.vue';
// import Addsuggession from './components/Addsuggession.vue'

const routes = [
    
    // {
    //     path: '/',
    //     name: 'Home',
    //     component: Home,
    // },
    // {
    //     path: '/card-details/:item',
    //     name: 'CardDetails',
    //     component: CardDetails,
    //     props: true,
        
    // },
    // {
    //     path: '/addsuggession',
    //     name: 'Addsuggession',
    //     component: Addsuggession,
    // },

    
];

const router = createRouter({
    history:createWebHistory(),
    routes,
    scrollBehavior(to) {
        if(to.hash) {
          return {
            el: to.hash,
            behavior: 'smooth',
          }

        } else {
          return {
            top: 0
          }
        }
      }
});
router.beforeEach((_to,from,next)=>{
    next();
});

export default router;