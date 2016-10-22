import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import DB from '../common/DB';

import './main.html';

Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
  this.subscribe('allUsers');
  this.subscribe('allRepos');
  this.subscribe('allCommits');
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
  commitsForUser: function() {
    return DB.Commits.find({
      userId: this.userId
    }).count();
  },
  commitsForRepo: function() {
    return DB.Commits.find({
      repoId: this.repoId
    }).count();
  }
});

Template.hello.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
  },
});
