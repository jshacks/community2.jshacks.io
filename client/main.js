import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import DB from '../common/DB';

import './main.html';

Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.isActive = new ReactiveVar("people");
  this.subscribe('allUsers');
  this.subscribe('allRepos');
  this.subscribe('allCommits');
  this.subscribe('allIssues');
  this.subscribe('allBranches');
});

Template.hello.helpers({
  users: function() {
    return DB.GithubUsers.find();
  },
  repos: function() {
    return DB.Repos.find();
  },
  commits: function() {
    return DB.Commits.find();
  },
  issues: function() {
    return DB.Issues.find();
  },
  branches: function() {
    return DB.Branches.find();
  },
  commitsForUser: function() {
    return DB.Commits.find({
      userId: this.userId
    }).count();
  },
  issuesForUser: function() {
    return DB.Issues.find({
      userId: this.userId
    }).count();
  },
  commitsForProject: function() {
    return DB.Commits.find({
      repoId: this.repoId
    }).count();
  },
  issuesForProject: function() {
    return DB.Issues.find({
          repoId: this.repoId
        }).count();
  },
  locForProject: function() {
    let project = DB.Repos.findOne({
      repoId: this.repoId
    });

    let stats = project.cloc;
    let total = 0;

    delete stats.SUM;
    _.each(stats, (i) => {
      total += i.code
    });

    return total;
  },
  totalFollowers: function() {
    console.log(this.following, this.followers)
    let users = _.pluck(DB.GithubUsers.find().fetch(),"login");
    return _.intersection(this.following,users).length + _.intersection(this.followers,users).length;
  },
  commitsForRepo: function() {
    return DB.Commits.find({
      repoId: this.repoId
    }).count();
  },
  isActive: function(who) {
    return Template.instance().isActive.get() === who ? 'active item select': 'item select';
  },
  isSelected: function(who) {
    return Template.instance().isActive.get() === who;
  },
  repoUsers: function() {
    let usersForIssues = _.pluck(DB.Issues.find({repoId:this.repoId}).fetch(), "userId");
    let usersForCommits = _.pluck(DB.Commits.find({repoId:this.repoId}).fetch(), "userId");

    return DB.GithubUsers.find({
      userId: {
        $in: _.union(usersForIssues,usersForCommits)
      }
    });
  },
  statistics: function() {
    let repo = DB.Repos.findOne({
      repoId: this.repoId
    });

    let stats = repo.cloc;
    delete stats.SUM;
    let toReturn = [];
   
    let keys = _.keys(stats);

    console.log(keys);
    _.each(keys,i=>{
      toReturn.push({
        lang: i,
        loc: stats[i].code
      });
    });

    return toReturn;

  }
});

Template.hello.events({
  'click a.select'(event, instance) {
    $(event.preventDefault());

    instance.isActive.set($(event.currentTarget).data('who'));
  },
});
