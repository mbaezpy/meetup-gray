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
        $("#C_nav .meta-topics-block a").each(function () {
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

      console.log("status: " + status + " url: " + url);
      if (status == "fail") {
        setTimeout(goNextPageMembers, 3000);
        return;
      }

      page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {

        var results = page.evaluate(function () {
          // total number of members
          var nMembers = parseInt($(".tabControl li:first .D_count").text().replace(/[()]/g, "").replace(",", ""));

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


        console.log("length(members): " + members.length + " of " + results.total);

        // deciding whether to go to next page
        if (members.length < results.total) {
          setTimeout(goNextPageMembers, 1000);
        } else {
          cb(members);
        }

      });
    });
  };

  // controling the pagination
  var goNextPageMembers = function () {
    processPage(url + "&offset=" + members.length, cb);
  };
  // starting the process
  goNextPageMembers();

};


exports.getMemberProfile = function (communityURL, memberId, cb) {
  var url = communityURL + "members/" + memberId;

  var processPage = function () {

    page.open(url, function (status) {

      if (status == "fail") {
        console.log("Failed in getting the member profile, trying again..");
        setTimeout(processPage, 3000);
        return;
      }      

      page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {
        var member = page.evaluate(function () {
          var profile = {};

          // retrieving general metadata
          profile.name = $("#D_groupMemberProfile h1 span[itemprop=name]").text();
          profile.communityURL = $("#C_metabox a.url").attr("href");
          profile.memLocality = $("#D_memberProfileMeta span[itemprop=addressLocality]").text();
          profile.memRegion = $("#D_memberProfileMeta span[itemprop=addressRegion]").text();
          profile.memCountry = $("#D_memberProfileMeta span[itemprop=addressCountry]").text();
          profile.hometown = $("#D_memberProfileMeta .D_less").text();
          if (profile.hometown != "") {
            profile.hometown = profile.hometown.split("\n").pop();
          }
          profile.memberSince = $($("#D_memberProfileMeta .D_memberProfileContentItem p").splice(1)).text();
          profile.photo = $("img.D_memberProfilePhoto").attr("src");

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
            var community = {
              chapterId: $(this).attr("data-chapterid"),
              name: $(this).find(".figureset-description .D_name a").text(),
              url: $(this).find(".figureset-description .D_name a").attr("href"),
              role: $(this).find(".figureset-description .text--secondary").text().trim(),
              membershipURL: $(this).find(".figureset-description .text--secondary a").attr("href")
            };
            if (!community.membershipURL) {
              community.membershipURL = "";
              community.memid = "";
            } else {
              community.memid = community.membershipURL.split("/").splice(5).shift();
            }

            communities.push(community);

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
        member.memid = memberId;
        cb(member);
      });
    });
  };

  processPage();

};


exports.getMeetups = function (communityURL, cb) {
  var url = communityURL + "events/past/";
  var events = [];

  //  page.onConsoleMessage = function (msg, lineNum, sourceId) {
  //    console.log('CONSOLE: ' + msg);
  //  };

  var processPage = function (url, cb) {
    page.open(url, function (status) {

      console.log("status: " + status + " url : " + url);
      if (status == "fail") {
        setTimeout(goNextPage, 3000);
        return;
      }

      page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function () {

        var results = page.evaluate(function () {
          // total number of members
          var nMembers = parseInt($(".tabControl li:first .D_count").text().replace(/[()]/g, ""));

          // list of members
          var list = [];
          $("#C_document .event-list .event-item").each(function () {
            var event = {};
            event.title = $(this).find(".event-title").text().trim();
            event.url = $(this).find(".event-title").attr("href");
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
          setTimeout(goNextPage, 1000);
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

    processPage(url + "?page=" + page, cb);
  };
  // starting the process
  goNextPage();

};


exports.getMeetupDetail = function (communityURL, eventId, cb) {
  var url = communityURL + "events/" + eventId + "/";
  var processPage = function () {
    page.open(url, function (status) {
      console.log(status);

      if (status == "fail") {
        setTimeout(processPage, 3000);
        return;
      }
      
      try {

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

              if ($(this).attr("data-commenttype") == "REPLY") {
                comment.replyTo = lastComment.commentId;
              } else {
                comment.replyTo = "";
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
              member.name = $(this).find(".member-name a").text().trim();
              member.role = $(this).find(".rsvp-introBlurb h6").text().trim().replace(/[\t\n]/g, "");
              member.guests = $(this).find(".member-name .rsvp-guests").text().trim();

              participants.push(member);
            });

            event.participants = participants;

            return event;
          });

          details.eventId = eventId;
          details.url = url;
          cb(details);
        });
        
      } catch(err){
        setTimeout(processPage, 3000);
        return;        
      }
    });
  }
  processPage();

};
