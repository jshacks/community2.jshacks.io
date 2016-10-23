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
  isActive(who) {
    return Template.instance().isActive.get() === who ? 'active item select': 'item select';
  },
  isSelected(who) {
    return Template.instance().isActive.get() === who;
  }
});

Template.hello.events({
  'click a.select'(event, instance) {
    $(event.preventDefault());

    instance.isActive.set($(event.currentTarget).data('who'));
  },
});
