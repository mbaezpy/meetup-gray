/**
 * Simple script that retrieves relevant information from 
 * a meetup community. 
 * This code was written only for research purposes.
 *
 * @author: Marcos Baez <baez@disi.unitn.it>
 * 
 */

var page = require('webpage').create();


exports.getCommunity = function (url, cb) {
  page.open(url, function (status) {
    page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {
      var community = page.evaluate(function () {
        var com = {};

        // retrieving general metadata
        com.name = $("#C_metabox span[itemprop=name]").text();
        com.url = $("#C_metabox span[itemprop=url]").text();
        com.locality = $("#C_metabox span[itemprop=addressLocality]").text();
        com.region = $("#C_metabox span[itemprop=addressRegion]").text();
        com.postalCode = $("#C_metabox span[itemprop=postalCode]").text();
        com.foundingDate = $("#C_metabox span[itemprop=foundingDate]").text();

        // list of topics of the community
        var list = [];
        $("#topicList14 a").each(function () {
          list.push({
            topicId: $(this).attr("data-topicid"),
            topic: $(this).attr("data-topic"),
            name: $(this).text()
          });
        });
        com.topics = list;

        // recommendations by meetup
        com.recommended = [];
        $("#meetup_serendipity ul li h5 a").each(function () {
          com.recommended.push({
            name: $(this).text(),
            url: $(this).attr("href")
          });
        });

        return com;
      });
      cb(community);
    });
  });
};


exports.getMembers = function (communityURL, cb) {
  var url = communityURL + "members/?sort=last_visited&desc=1";
  var members = [];

  //  page.onConsoleMessage = function(msg, lineNum, sourceId) {
  //    console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
  //  };

  var processPage = function (url, cb) {
    page.open(url, function (status) {
      page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {

        var results = page.evaluate(function () {
          // total number of members
          var nMembers = parseInt($(".tabControl li:first .D_count").text().replace(/[()]/g, ""));

          // list of members
          var list = [];
          $("#memberList li.memberInfo").each(function () {
            var member = {};
            member.memid = $(this).attr("data-memid");
            member.name = $(this).find(".memName").text();
            member.joinDate = $(this).find(".memberStats li:first span").text().trim();
            member.community = $("#C_metabox span[itemprop=url]").text();

            list.push(member);
          });

          return {
            list: list,
            total: nMembers
          };
        });

        // processing results
        results.list.forEach(function (data) {
          members.push(data);
        });

        // deciding whether to go to next page
        if (members.length < results.total) {
          setTimeout(goNextPage, 100);
        } else {
          cb(members);
        }

      });
    });
  };

  // controling the pagination
  var goNextPage = function () {
    console.log("length(members): " + members.length);
    processPage(url + "&offset=" + members.length, cb);
  };
  // starting the process
  goNextPage();

};


exports.getMemberProfile = function (communityURL, memberId, cb) {
  var url = communityURL + "members/" + memberId;
  page.open(url, function (status) {
    page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {
      var member = page.evaluate(function () {
        var profile = {};

        // retrieving general metadata
        profile.name = $("#D_memberProfileMeta span[itemprop=name]").text();
        profile.url = $("#C_metabox a.url").attr("href"),
          profile.locality = $("#D_memberProfileMeta span[itemprop=addressLocality]").text();
        profile.region = $("#D_memberProfileMeta span[itemprop=addressRegion]").text();
        profile.country = $("#D_memberProfileMeta span[itemprop=addressCountry]").text();
        profile.hometown = $("#D_memberProfileMeta .D_less").text();
        profile.memberSince = $("#D_memberProfileMeta .D_memberProfileContentItem p").text();
        profile.photo = $("img .D_memberProfilePhoto").attr("src");

        // Answers to the questions posed by the community
        var list = [];
        $("#D_memberProfileQuestions > .D_memberProfileContentItem").each(function () {
          list.push({
            question: $(this).find("h4").text(),
            answer: $(this).find("p").text(),
          });
        });
        profile.questions = list;

        // Other groups where the member is participating
        var communities = [];
        $("#my-meetup-groups-list li").each(function () {
          communities.push({
            chapterId: $(this).attr("data-chapterid"),
            name: $(this).find(".figureset-description .D_name a").text(),
            url: $(this).find(".figureset-description .D_name a").attr("href"),
            role: $(this).find(".figureset-description .text--secondary").text().trim(),
            membershipURL: $(this).find(".figureset-description .text--secondary a").attr("href")
          });
        });

        profile.communities = communities;

        var topics = [];
        $("#memberTopicList li a").each(function () {
          topics.push({
            topicId: $(this).attr("data-topicid"),
            topic: $(this).attr("data-topic"),
            name: $(this).text()
          });
        });
        profile.topics = topics;

        return profile;
      });
      cb(member);
    });
  });

};


exports.getMeetups = function (communityURL, cb) {
  var url = communityURL + "events/past/";
  var events = [];

  var processPage = function (url, cb) {
    page.open(url, function (status) {
      page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {

        var results = page.evaluate(function () {
          // total number of members
          var nMembers = parseInt($(".tabControl li:first .D_count").text().replace(/[()]/g, ""));

          // list of members
          var list = [];
          $("#C_document .event-list .event-item").each(function () {
            var event = {};
            event.title = $(this).find(".event-title").text().trim();
            event.url = $(this).find(".event-title").attr("src");
            event.eventId = event.url.split("/").splice(5).shift();
            event.date = $(this).find("div.flush--left").text().trim();
            event.wentCount = $(this).find(".event-rating").text().trim().split("\n").shift();

            // parsing rating from the "star" rating caption
            var rating = $(this).find(".event-rating img").attr("title");
            if (rating) {
              rating = rating.replace(" ratings for an average of ", " ").
              replace(" out of ", " ").split(" ");

              event.ratingAvg = rating.shift();
              event.ratingCount = rating.shift();
            }

            // parsing photos count
            if ($(this).find(".event-rating a").length > 0) {
              event.photosCount = $(this).find(".event-rating  a").text().trim().split(" ").shift();
            }

            list.push(event);
          });

          return list;
        });

        // processing results
        results.forEach(function (data) {
          events.push(data);
        });

        // deciding whether to go to next page
        if (results.length > 0) {
          setTimeout(goNextPage, 500);
        } else {
          cb(events);
        }

      });
    });
  };

  // controling the pagination
  var goNextPage = function () {
    var page = Math.ceil(events.length / 5);
    console.log("length(events): " + events.length + " page = " + page);

    if (events.length > 0) {
      console.log(events[events.length - 1].title + " " + events[events.length - 1].date);
    }

    processPage(url + "?page=" + page, cb);
  };
  // starting the process
  goNextPage();

};


exports.getMeetupDetail = function (communityURL, eventId, cb) {
  var url = communityURL + "events/" + eventId + "/";
  page.open(url, function (status) {
    page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {
      var details = page.evaluate(function () {
        var event = {};

        event.title = $("#eventdets #event-title").text().trim();
        event.date = $("#eventdets .past-event-info li:first").text().trim();
        event.locAddress = $("#eventdets .past-event-info li[data-address]").attr("data-address");
        event.locName = $("#eventdets .past-event-info li[data-address]").attr("data-name");
        event.description = $("#eventdets #past-event-description-wrap p:first").text();

        // Answers to the questions posed by the community
        var comments = [];
        var lastComment = {};
        $("#conversation li[data-commenttype]").each(function () {
          var comment = {};
          comment.commentId = $(this).attr("id");
          comment.memid = $(this).find("h5 a").attr("data-memberid");
          comment.name = $(this).find("h5 a").attr("title");
          comment.body = $(this).find(".comment-body").text().trim();
          
          var extra = $(this).find(".figureset-description > p").text().trim().split(" · ");
          comment.likes = extra.shift();
          comment.date = extra.shift().trim();
          
          if ($(this).attr("data-commenttype") == "REPLY"){
            comment.replyTo = lastComment.commentId;
          } else {
            lastComment = comment;
          }
          
          comments.push(comment);
        });
        event.comments = comments;

        // Other groups where the member is participating
        var participants = [];
        $("#rsvp-list > li").each(function () {
          var member = {};
          member.memid = $(this).attr("data-memberid");
          member.name = $(this).find(".member-name").text().trim();
          member.role = $(this).find(".rsvp-introBlurb h6").text().trim();

          participants.push(member);
        });

        event.participants = participants;

        return event;
      });
      
      details.eventId = eventId;
      details.url = url;
      cb(details);
    });
  });

};

