'use strict';


/**
 * @name smssync
 * @description smsync endpoint for nodejs
 * @author lally elias <lallyelias87@mail.com>
 * @since  0.1.0
 * @version 0.1.0
 */


//dependencies
const _ = require('lodash');
const express = require('express');
const respond = require('express-respond');
const bodyParser = require('body-parser');
const router = express.Router();

//smssync tasks
const TASK_SEND = 'send';
const TASK_RESULT = 'result';
const TASK_SENT = 'sent';

exports = module.exports = function (options) {

  //merge options
  options = _.merge({}, {

    //endpoint path
    endpoint: 'smssync',

    //a secret key to be used verify smssync device
    secret: 'smssync',

    //allow to reply with a sms to a sender
    reply: true,

    // allow internal error handling & no error will be passed to error 
    // middleware
    error: true

  }, options);


  //use express respond
  router.use(respond());

  //apply body parser middlewares
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({
    extended: true
  }));


  /**
   * Handle Http POST on /smssync
   * @description receive smssync sent sms
   * @param  {HttpRequest} request  a http request
   * @param  {HttpResponse} response a http response
   * @param {Function} next next middleware to invoke incase of error
   */
  router.post('/' + options.endpoint, function (request, response, next) {
    //obtain sent sms, queued sms uuids or sms delivery result
    const body = request.body;

    //TODO ensure secret match

    //obtain request task
    const task = (request.query || {}).task;

    //handle sent delivery status
    if (task && task === TASK_SENT) {

      //handle over queued message uuids
      const queued = _.get(body, 'queued_messages');
      options.onSent(queued, function (error, result) {

        //prepare sent reply
        const reply = {
          'queued_messages': [].concat(result)
        };

        response.ok(reply);

      });

    }

    //handle delivery status
    else if (task && task === TASK_RESULT) {
      //TODO
    }

    //receive sms
    else {
      //hand over message to a receiver
      options
        .onReceive(body, function (error, result) {

          //pass error to error handler middleware
          if (error && !options.error) {
            next(error);
          }

          //handle error
          else if (error && options.error) {

            //obtain error message
            const message = error.message ||
              'Fail to process received message';

            //prepare smsync error response
            const reply = {
              payload: {
                success: false,
                error: message
              }
            };

            //respond with error
            response.ok(reply);

          }

          //handle success
          else {

            //prepare smsync success response
            let reply = {
              payload: {
                success: true,
                error: null
              }
            };

            //check if smsync endpoint is configure to reply with sms
            if (options.reply) {
              delete reply.payload.error;

              //update reply with reply message(s)
              reply.payload.task = TASK_SEND;

              //prepare reply messages
              const messages = [].concat(result);
              reply.payload.messages = messages;
            }

            //respond with success
            response.ok(reply);

          }

        });
    }

  });


  /**
   * Handle Http GET on /smssync
   * @description provide smssync with sms to send
   * @param  {HttpRequest} request  a http request
   * @param  {HttpResponse} response a http response
   * @param {Function} next next middleware to invoke incase of error
   */
  router.get('/' + options.endpoint, function (request, response, next) {
    //TODO ensure secret match

    //obtain request task
    const task = (request.query || {}).task;

    //handle result task and respond with sms waiting
    //delivery report
    if (task && task === TASK_RESULT) {

      //obtain sms waiting delivery report
      options.onQueued(function (error, result) {

        //prepare wait delivery reply
        const reply = {
          'message_uuids': [].concat(result)
        };

        response.ok(reply);

      });

    }

    //reply with sms to send
    else {

      //obtain sms to send
      options.onSend(function (error, result) {

        //pass error to error handler middleware
        if (error && !options.error) {
          next(error);
        }

        //handle error
        else if (error && options.error) {

          //obtain error message
          const message = error.message ||
            'Fail to obtain message to send';

          //prepare smsync error response
          const reply = {
            payload: {
              success: false,
              error: message
            }
          };

          //respond with error
          response.ok(reply);

        }

        //handle success
        else {

          //prepare sms to send reply
          const reply = {
            payload: {
              task: TASK_SEND,
              secret: options.secret,
              messages: [].concat(result)
            }
          };

          response.ok(reply);
        }

      });

    }

  });


  return router;

};
