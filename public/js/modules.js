// modules.js — Module-Based Progression System (v4)
// Defines learning modules with prerequisites and unlock logic

(function () {
  'use strict';

  const MODULES = [
    {
      id: "m1",
      title: "How the Browser Works",
      subtitle: "The client is never trustworthy",
      color: "#4ade80",
      challenges: ["a02", "a03-dom", "a04"],
      prerequisite: null
    },
    {
      id: "m2",
      title: "Trusting the Client",
      subtitle: "What the browser controls, the user controls",
      color: "#f5a623",
      challenges: ["a01", "a08", "a05"],
      prerequisite: "m1"
    },
    {
      id: "m3",
      title: "The Server Side",
      subtitle: "Backend vulnerabilities have real blast radius",
      color: "#f87171",
      challenges: ["a07", "a01-idor", "a03-sqli", "a03-stored-xss"],
      prerequisite: "m2"
    },
    {
      id: "m4",
      title: "The Full System",
      subtitle: "When everything goes wrong at once",
      color: "#a78bfa",
      challenges: ["a06", "a09", "a10"],
      prerequisite: "m3"
    }
  ];

  // Map challenge data-challenge IDs to SubShop.CHALLENGES numeric IDs
  const CHALLENGE_ID_MAP = {
    'a01':            1,
    'a02':            2,
    'a03-dom':        3,
    'a04':            4,
    'a05':            5,
    'a06':            6,
    'a07':            7,
    'a08':            8,
    'a09':            9,
    'a10':           10,
    'a03-sqli':      11,
    'a01-idor':      12,
    'a03-stored-xss':13
  };

  function getCompletedChallenges() {
    try {
      return JSON.parse(localStorage.getItem('completedChallenges') || '[]');
    } catch (e) {
      return [];
    }
  }

  function addCompletedChallenge(challengeId) {
    const completed = getCompletedChallenges();
    if (!completed.includes(challengeId)) {
      completed.push(challengeId);
      localStorage.setItem('completedChallenges', JSON.stringify(completed));
    }
    // Also update legacy progress for backward compat
    const numId = CHALLENGE_ID_MAP[challengeId];
    if (numId && window.SubShop) {
      const progress = SubShop.getProgress();
      if (!progress[numId]) {
        progress[numId] = { completedAt: new Date().toISOString() };
        localStorage.setItem('subshop_progress', JSON.stringify(progress));
      }
    }
  }

  function isModuleUnlocked(moduleId) {
    const mod = MODULES.find(m => m.id === moduleId);
    if (!mod) return false;
    if (!mod.prerequisite) return true;
    return isModuleComplete(mod.prerequisite);
  }

  function isModuleComplete(moduleId) {
    const mod = MODULES.find(m => m.id === moduleId);
    if (!mod) return false;
    const completed = getCompletedChallenges();
    return mod.challenges.every(c => completed.includes(c));
  }

  function getModuleProgress(moduleId) {
    const mod = MODULES.find(m => m.id === moduleId);
    if (!mod) return { done: 0, total: 0 };
    const completed = getCompletedChallenges();
    const done = mod.challenges.filter(c => completed.includes(c)).length;
    return { done, total: mod.challenges.length };
  }

  function getModuleForChallenge(challengeId) {
    return MODULES.find(m => m.challenges.includes(challengeId)) || null;
  }

  function getChallengeNumericId(challengeId) {
    return CHALLENGE_ID_MAP[challengeId] || null;
  }

  function getChallengeInfo(challengeId) {
    const numId = CHALLENGE_ID_MAP[challengeId];
    if (!numId || !window.SubShop) return null;
    return SubShop.CHALLENGES.find(c => c.id === numId);
  }

  window.Modules = {
    MODULES,
    CHALLENGE_ID_MAP,
    getCompletedChallenges,
    addCompletedChallenge,
    isModuleUnlocked,
    isModuleComplete,
    getModuleProgress,
    getModuleForChallenge,
    getChallengeNumericId,
    getChallengeInfo
  };
})();
