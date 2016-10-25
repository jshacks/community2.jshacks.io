import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import R from 'ramda'

import DB from '../common/DB';

import './main.html';

Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.isActive = new ReactiveVar("event");
  this.usersort = new ReactiveVar("login");
  this.projectsort = new ReactiveVar("name");
  this.subscribe('allUsers');
  this.subscribe('allRepos');
  this.subscribe('allCommits');
  this.subscribe('allIssues');
  this.subscribe('allBranches');
});

let logos = {
  Twig: '/twig.png',
  JSON: '/json.png',
  Markdown: '/markdown.png',
  JavaScript: '/js.png',
  HTML: '/html.png',
  Ruby: '/ruby.png',
  YAML: '/yml.png',
  CSS: '/css.png',
  TypeScript: '/ts.png',
  SASS: 'sass.png',
  Pug: 'pug.jpg',
  'Bourne Shell': '/bash.png',
  PHP: '/php.png',
  Elm: '/elm.png',
  XML: '/xml.png',
  Python: '/python.png',
  Blade: 'laravel.png',
  Java: 'java.png',
  'Qt Linguist': 'qt.png'
}

Template.hello.helpers({
  totalCloc: function () {
    let repos = DB.Repos.find().fetch()

    let cloc = R.pipe(
      R.map(R.prop('cloc')),
      R.reduce((acc, x) => {
        R.mapObjIndexed((v, k, o) => {
          if (!acc[k]) {
            acc[k] = v
          } else {
            R.mapObjIndexed((v2, k2, o2) => {
              acc[k][k2] = acc[k][k2] + v2
            }, v)
          }
        }, x)
        return acc
      }, {})
    )(repos)

    let files = R.omit('SUM', cloc)

    files = R.mapObjIndexed((v, k) => {
      v.name = k
      return v
    }, files)

    files = R.values(files)

    let totalCloc = {
      sum: R.prop('SUM', cloc),
      files: files,
      types: R.keys(R.omit('SUM', cloc))
    }

    return totalCloc
  },
  totalCommits: function () {
    let commits = DB.Commits.find().fetch()

    return commits.length
  },
  logo: function () {
    return logos[this];
  },
  users: function() {
    let users = DB.GithubUsers.find().fetch();
    let sort = Template.instance().usersort.get() || 'login';

    _.each(users, (u) => {
      u.issuesForUser = DB.Issues.find({
        userId: u.userId
      }).count(); 

      u.commitsForUser = DB.Commits.find({
        userId: u.userId
      }).count();

      let us = R.map(R.prop('login'), DB.GithubUsers.find().fetch())
      let socialUsers = R.concat(u.following, u.followers)
      let inter = R.intersection(us, socialUsers)
      u.socialStats = inter.length
    })
    
    return _.sortBy(users, function(u) {
      if(sort === "login")
        return u[sort];
      else
        return 0 - u[sort];
    });  
  },
  totalUsers: function () {
    return DB.GithubUsers.find().fetch().length
  },
  totalRepos: function () {
    return DB.Repos.find().fetch().length
  },
  repos: function() {
    let repos = DB.Repos.find().fetch();
    let sort = Template.instance().projectsort.get() || 'name';

    _.each(repos, (r) => {
      r.commitsForProject = DB.Commits.find({
        repoId: r.repoId
      }).count();

      r.issuesForProject = DB.Issues.find({
        repoId: r.repoId
      }).count();

      let project = DB.Repos.findOne({
        repoId: r.repoId
      });

      let stats = project.cloc;
      let total = 0;

      delete stats.SUM;
      _.each(stats, (i) => {
        total += i.code
      });

      r.locForProject = total;
    });

    return _.sortBy(repos, function(r) {
      if(sort === "name")
        return r[sort];
      else
        return 0 - r[sort];
    });
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
  commitsForRepo: function() {
    return DB.Commits.find({
      repoId: this.repoId
    }).count();
  },
  isActive: function(who) {
    return Template.instance().isActive.get() === who ? 'active item select': 'item select';
  },
  isFilteredUser: function(who) {
    return Template.instance().usersort.get() === who ? 'active item': 'item';
  },
  isFilteredProject: function(who) {
    return Template.instance().projectsort.get() === who ? 'active item': 'item';
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

    
    _.each(keys,i=>{

      if(i=== "SUM") return;
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
  'click .sortPeople a'(event, instance) {
    $(event.preventDefault());

    if(instance.usersort.get() === $(event.currentTarget).data('who')) instance.usersort.set('login')
    else instance.usersort.set($(event.currentTarget).data('who'));
  },
  'click .sortProjects a'(event, instance) {
    $(event.preventDefault());

    if(instance.projectsort.get() === $(event.currentTarget).data('who')) instance.projectsort.set('login')
    else instance.projectsort.set($(event.currentTarget).data('who'));
  },
});
