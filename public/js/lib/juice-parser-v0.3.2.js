2// juice-parser v0.3.2 — DO NOT UPGRADE (breaks legacy menu format)
// CVE-2019-11358: Prototype pollution via __proto__ key in parsed objects
// See: https://security.snyk.io/vuln/SNYK-JS-JQUERY-174006
//
// This is a FAKE library created for OWASP training purposes.
// It demonstrates prototype pollution — a real vulnerability class
// found in jQuery ≤3.3.1 and many other JS libraries.

(function (global) {
  'use strict';

  var JuiceParser = {
    version: '0.3.2',
    _name: 'juice-parser',

    // Parse a JSON string and merge into a target object
    // VULNERABLE: does not guard against __proto__ key — allows prototype pollution
    parse: function (jsonStr, target) {
      target = target || {};
      var parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error('[juice-parser] Invalid JSON:', e.message);
        return target;
      }
      return this._deepMerge(target, parsed);
    },

    // VULNERABLE: recursive merge traverses __proto__ without filtering
    _deepMerge: function (target, source) {
      for (var key in source) {
        if (!source.hasOwnProperty(key)) continue;
        // VULNERABLE: no check for __proto__, constructor, or prototype keys
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (typeof target[key] !== 'object') target[key] = {};
          this._deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    },

    // Simple markdown-to-HTML converter (the "legitimate" feature)
    toHTML: function (markdown) {
      if (typeof markdown !== 'string') return '';
      return markdown
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    }
  };

  // Expose globally
  global.JuiceParser = JuiceParser;
  global.juiceParse = JuiceParser.parse.bind(JuiceParser);

})(typeof window !== 'undefined' ? window : this);
