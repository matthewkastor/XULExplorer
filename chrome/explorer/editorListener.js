
var EditorListener = {
  _handler : null,
  _enabled : true,
  _timeout : -1,
  _batch : false,
  _editor : null,

  init : function(aHandler) {
    this._handler = aHandler;
  },

  attach : function(aEditor) {
    if (this._editor) {
      this._editor.transactionManager.RemoveListener(this);
    }

    this._editor = aEditor;

    if (this._editor) {
      this._editor.transactionManager.AddListener(this);
    }
  },

  get enabled() {
    return this._enabled;
  },
  set enabled(aEnabled) {
    this._enabled = aEnabled;
  },

  refresh : function() {
    if (!this._enabled || this._batch)
      return;

    if (this._timeout != -1)
      window.clearTimeout(this._timeout);

    var self = this;
    this._timeout = window.setTimeout(function() { self._handler(); }, 1000);
  },

  didDo : function(aManager, aTransaction, aResult) {
    this.refresh();
  },

  didUndo : function(aManager, aTransaction, aResult) {
    this.refresh();
  },

  didRedo : function(aManager, aTransaction, aResult) {
    this.refresh();
  },

  didBeginBatch : function(aManager, aResult) {
    this.batch = true;
  },

  didEndBatch : function(aManager, aResult) {
    this.batch = false;
    this.refresh();
  },

  didMerge : function(aManager, aTopTransaction, aTransactionToMerge, aDidMerge, aResult) {
    this.refresh();
  },

  willDo : function(aManager, aTransaction) { return false; },
  willUndo : function(aManager, aTransaction) { return false; },
  willRedo : function(aManager, aTransaction) { return false; },
  willBeginBatch : function(aManager) { return false; },
  willEndBatch : function(aManager) { return false; },
  willMerge : function(aManager, aTopTransaction, aTransactionToMerge) { return false; }
};
