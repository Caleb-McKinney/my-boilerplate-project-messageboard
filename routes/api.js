'use strict';

const crypto = require('crypto');

const boards = new Map();

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

function getBoard(boardName) {
  if (!boards.has(boardName)) {
    boards.set(boardName, []);
  }
  return boards.get(boardName);
}

function sanitizeReply(reply) {
  return {
    _id: reply._id,
    text: reply.text,
    created_on: reply.created_on
  };
}

function sanitizeThread(thread, includeAllReplies) {
  const replies = includeAllReplies
    ? thread.replies
    : thread.replies.slice(-3);

  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    replies: replies.map(sanitizeReply),
    replycount: thread.replies.length
  };
}

module.exports = function (app) {
  app.route('/api/threads/:board')
    .post(function(req, res) {
      const boardName = req.params.board;
      const text = req.body.text;
      const deletePassword = req.body.delete_password;

      if (!text || !deletePassword) {
        return res.status(400).send('missing required fields');
      }

      const now = new Date();
      const thread = {
        _id: generateId(),
        text: text,
        created_on: now,
        bumped_on: now,
        reported: false,
        delete_password: deletePassword,
        replies: []
      };

      const board = getBoard(boardName);
      board.push(thread);

      return res.json(sanitizeThread(thread, true));
    })
    .get(function(req, res) {
      const boardName = req.params.board;
      const board = getBoard(boardName);

      const threads = board
        .slice()
        .sort(function(a, b) {
          return b.bumped_on - a.bumped_on;
        })
        .slice(0, 10)
        .map(function(thread) {
          return sanitizeThread(thread, false);
        });

      return res.json(threads);
    })
    .delete(function(req, res) {
      const boardName = req.params.board;
      const threadId = req.body.thread_id;
      const deletePassword = req.body.delete_password;

      const board = getBoard(boardName);
      const index = board.findIndex(function(thread) {
        return thread._id === threadId;
      });

      if (index === -1) {
        return res.status(404).send('thread not found');
      }

      if (board[index].delete_password !== deletePassword) {
        return res.send('incorrect password');
      }

      board.splice(index, 1);
      return res.send('success');
    })
    .put(function(req, res) {
      const boardName = req.params.board;
      const threadId = req.body.thread_id || req.body.report_id;
      const board = getBoard(boardName);
      const thread = board.find(function(item) {
        return item._id === threadId;
      });

      if (!thread) {
        return res.status(404).send('thread not found');
      }

      thread.reported = true;
      return res.send('reported');
    });

  app.route('/api/replies/:board')
    .post(function(req, res) {
      const boardName = req.params.board;
      const threadId = req.body.thread_id;
      const text = req.body.text;
      const deletePassword = req.body.delete_password;

      if (!threadId || !text || !deletePassword) {
        return res.status(400).send('missing required fields');
      }

      const board = getBoard(boardName);
      const thread = board.find(function(item) {
        return item._id === threadId;
      });

      if (!thread) {
        return res.status(404).send('thread not found');
      }

      const reply = {
        _id: generateId(),
        text: text,
        created_on: new Date(),
        delete_password: deletePassword,
        reported: false
      };

      thread.replies.push(reply);
      thread.bumped_on = reply.created_on;

      return res.json(sanitizeThread(thread, true));
    })
    .get(function(req, res) {
      const boardName = req.params.board;
      const threadId = req.query.thread_id;

      const board = getBoard(boardName);
      const thread = board.find(function(item) {
        return item._id === threadId;
      });

      if (!thread) {
        return res.status(404).send('thread not found');
      }

      return res.json(sanitizeThread(thread, true));
    })
    .delete(function(req, res) {
      const boardName = req.params.board;
      const threadId = req.body.thread_id;
      const replyId = req.body.reply_id;
      const deletePassword = req.body.delete_password;

      const board = getBoard(boardName);
      const thread = board.find(function(item) {
        return item._id === threadId;
      });

      if (!thread) {
        return res.status(404).send('thread not found');
      }

      const reply = thread.replies.find(function(item) {
        return item._id === replyId;
      });

      if (!reply) {
        return res.status(404).send('reply not found');
      }

      if (reply.delete_password !== deletePassword) {
        return res.send('incorrect password');
      }

      reply.text = '[deleted]';
      return res.send('success');
    })
    .put(function(req, res) {
      const boardName = req.params.board;
      const threadId = req.body.thread_id;
      const replyId = req.body.reply_id;

      const board = getBoard(boardName);
      const thread = board.find(function(item) {
        return item._id === threadId;
      });

      if (!thread) {
        return res.status(404).send('thread not found');
      }

      const reply = thread.replies.find(function(item) {
        return item._id === replyId;
      });

      if (!reply) {
        return res.status(404).send('reply not found');
      }

      reply.reported = true;
      return res.send('reported');
    });
};
