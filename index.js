/**
 * Simple script that retrieves relevant information from 
 * a meetup community. 
 * This code was written only for research purposes.
 *
 * @author: Marcos Baez <baez@disi.unitn.it>
 * 
 */
var system = require('system');
var fs = require('fs');
var meetup = require('./meetup');


if (system.args.length === 1) {
  console.log('Usage: index.js <meetup URL>');
  phantom.exit();
}

var url = system.args[1];

meetup.getCommunity(url, function (com) {

  // writing results to file
  var content = JSON.stringify(com);
  var path = com.name;
  fs.write(path + ".json", content, 'w');

  console.log("Community obtained.");

//  getListOfMeetups(url, function (meetups) {
//    var content = JSON.stringify(meetups);
//    fs.write(path + "_meetups.json", content, 'w');
//
//    console.log("Process finished.");
//
//    phantom.exit();
//  });

    getListOfMembers(url, function (members) {
      var content = JSON.stringify(members);
      fs.write(path + "_members.json", content, 'w');
  
      console.log("List of members finished. Total : " + members.length + ".");
      
      
      getListOfMeetups(url, function (meetups) {
        var content = JSON.stringify(meetups);
        fs.write(path + "_meetups.json", content, 'w');
  
        console.log("Process finished.");
  
        phantom.exit();
      });      
  
    });  

});


var getListOfMembers = function (url, cb) {

  meetup.getMembers(url, function (list) {
    var members = [];

    console.log("List of members obtained.");

    // Getting members details
    var consumeMem = function (member, cb) {
      meetup.getMemberProfile(url, member.memid, function (profile) {

        console.log("Member [" + members.length + "] " + member.memid + " obtained.");

        members.push(profile);        
        
        if (list.length > 0) {
          setTimeout(goNextMember, 500 + Math.round(2000 * Math.random()));
        } else {
          cb(members);
        }
      });
    };

    var goNextMember = function () {
      consumeMem(list.shift(), cb);
    };

    goNextMember();

  });
};


var getListOfMeetups = function (url, cb) {

  meetup.getMeetups(url, function (list) {
    var meetups = [];

    console.log("List of meetups obtained. Total: "+ list.length);

    // Getting members details
    var consumeMeet = function (event, cb) {

      meetup.getMeetupDetail(url, event.eventId, function (detail) {

        console.log("Meetup [" + meetups.length + "] " + event.eventId + " obtained.");

        // enrich meetup information
        detail.wentCount = event.wentCount;
        detail.ratingAvg = event.ratingAvg;
        detail.ratingCount = event.ratingCount;
        detail.photosCount = event.photosCount;

        meetups.push(detail);
        if (list.length > 0) {
          setTimeout(goNextMeetup, 500 + Math.round(1000 * Math.random()));
        } else {
          cb(meetups);
        }
      });
    };

    var goNextMeetup = function () {
      consumeMeet(list.shift(), cb);
    };

    console.log("Starting meetup detail retrieval.");
    goNextMeetup();

  });
};

