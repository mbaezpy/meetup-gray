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




var getListOfMembers = function (url, startAt, cb) {

  var pageSlice = startAt % 20;
  var pageStart = startAt - pageSlice;
  
  
  meetup.getMembers(url, pageStart, function (list) {
    if (list.length == 0){
      cb.done(0);
    }
    
    var n = startAt;
    list = list.splice(pageSlice);

    console.log("List of members obtained.");

    // Getting members details
    var consumeMem = function (member, cb) {
      meetup.getMemberProfile(url, member.memid, function (profile) {

        console.log("Member [" + n + "] " + member.memid + " obtained.");
        cb.log(profile, n);

        if (list.length > 0) {
          setTimeout(goNextMember, 500 + Math.round(1000 * Math.random()));
        } else {
          cb.done(n);
        }
      });
    };

    var goNextMember = function () {
      n++;
      
      var member = list.shift();
      try {

        // This is to force phantomjs to release memory
        if (n % 50 == 0) {
          setTimeout(function () {
            setTimeout(function () {
              meetup.reload();
              consumeMem(member, cb);
            }, 1);
          }, 1000);
        } else {
          consumeMem(member, cb);
        }
        
      } catch (err) {
        console.log("There has been a problem.");
        consumeMem(member, cb);
      }
    };

    goNextMember();

  });
};


var getListOfMeetups = function (url, cb) {

  meetup.getMeetups(url, function (list) {
    var meetups = [];
    if (list.length == 0) cb([]);

    console.log("List of meetups obtained. Total: " + list.length);

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

      var item = list.shift();
      try {
        consumeMeet(item, cb);
      } catch (err) {
        console.log("There has been a problem. Trying again.");
        consumeMeet(item, cb);
      }

    };

    console.log("Starting meetup detail retrieval.");
    goNextMeetup();

  });
};


/** Main execution thread **/


if (system.args.length < 3) {
  console.log('Usage: index.js [members | meetups] <meetup URL>');
  phantom.exit();
}

var resource = system.args[1];
var url = system.args[2];
var startAt = system.args[3];
startAt = startAt? parseInt(startAt) : 0;

meetup.init();

if (resource == "members") {

  meetup.getCommunity(url, function (com) {

    console.log("Community obtained.");

    // Writing the community to file
    var content = JSON.stringify(com);
    var path = "data/" + com.name;
    fs.write(path + ".json", content, 'w');


    // Initialising the members file, 
    // Members are written as they arrive to avoid
    // keeping them in memory
    if (startAt === 0){
      fs.write(path + "_members.json", "[", 'w');
    }

    getListOfMembers(url, startAt, {

      // Writing each member to file, as they arrive
      log: function (profile, n) {
        var content = JSON.stringify(profile);
        if (n > 1) content = "," + content;
        fs.write(path + "_members.json", content + "\n", 'a');
      },

      done: function (total) {
        console.log("List of members finished. Total : " + total + ".");
        fs.write(path + "_members.json", "]", 'a');
        phantom.exit();
      }

    });

  });

} else {

  meetup.getCommunity(url, function (com) {

    console.log("Community obtained.");

    var path = "data/" + com.name;

    // Meetups tend to be very few, so we keep them in memory and
    // write them all at once. 
    getListOfMeetups(url, function (meetups) {
      var content = JSON.stringify(meetups);
      fs.write(path + "_meetups.json", content, 'w');

      console.log("Process finished.");

      phantom.exit();
    });

  });

}
