const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
	const board = 'test';
	const threadText = 'Test thread text';
	const threadDeletePassword = 'thread-delete';
	const replyText = 'Test reply text';
	const replyDeletePassword = 'reply-delete';

	let threadId;
	let replyId;

	test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
		chai.request(server)
			.post('/api/threads/' + board)
			.send({ text: threadText, delete_password: threadDeletePassword })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.isObject(res.body);
				assert.property(res.body, '_id');
				assert.equal(res.body.text, threadText);
				threadId = res.body._id;
				done();
			});
	});

	test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
		chai.request(server)
			.get('/api/threads/' + board)
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.isArray(res.body);
				assert.isAtMost(res.body.length, 10);
				if (res.body.length > 0) {
					const thread = res.body[0];
					assert.property(thread, '_id');
					assert.property(thread, 'replies');
					assert.isArray(thread.replies);
					assert.isAtMost(thread.replies.length, 3);
					assert.notProperty(thread, 'delete_password');
					assert.notProperty(thread, 'reported');
				}
				done();
			});
	});

	test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function(done) {
		chai.request(server)
			.delete('/api/threads/' + board)
			.send({ thread_id: threadId, delete_password: 'wrong-password' })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.equal(res.text, 'incorrect password');
				done();
			});
	});

	test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
		chai.request(server)
			.put('/api/threads/' + board)
			.send({ thread_id: threadId })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.equal(res.text, 'reported');
				done();
			});
	});

	test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
		chai.request(server)
			.post('/api/replies/' + board)
			.send({ thread_id: threadId, text: replyText, delete_password: replyDeletePassword })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.isObject(res.body);
				assert.property(res.body, 'replies');
				assert.isArray(res.body.replies);
				assert.isAtLeast(res.body.replies.length, 1);
				replyId = res.body.replies[res.body.replies.length - 1]._id;
				done();
			});
	});

	test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
		chai.request(server)
			.get('/api/replies/' + board)
			.query({ thread_id: threadId })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.isObject(res.body);
				assert.equal(res.body._id, threadId);
				assert.isArray(res.body.replies);
				assert.notProperty(res.body, 'delete_password');
				assert.notProperty(res.body, 'reported');
				done();
			});
	});

	test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function(done) {
		chai.request(server)
			.delete('/api/replies/' + board)
			.send({ thread_id: threadId, reply_id: replyId, delete_password: 'wrong-password' })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.equal(res.text, 'incorrect password');
				done();
			});
	});

	test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
		chai.request(server)
			.put('/api/replies/' + board)
			.send({ thread_id: threadId, reply_id: replyId })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.equal(res.text, 'reported');
				done();
			});
	});

	test('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function(done) {
		chai.request(server)
			.delete('/api/replies/' + board)
			.send({ thread_id: threadId, reply_id: replyId, delete_password: replyDeletePassword })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.equal(res.text, 'success');
				done();
			});
	});

	test('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function(done) {
		chai.request(server)
			.delete('/api/threads/' + board)
			.send({ thread_id: threadId, delete_password: threadDeletePassword })
			.end(function(err, res) {
				assert.equal(res.status, 200);
				assert.equal(res.text, 'success');
				done();
			});
	});
});
