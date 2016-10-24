import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import R from 'ramda'

import DB from '../common/DB';

import './main.html';

Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.isActive = new ReactiveVar("event");
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
    return DB.GithubUsers.find();
  },
  totalUsers: function () {
    return DB.GithubUsers.find().fetch().length
  },
  totalRepos: function () {
    return DB.Repos.find().fetch().length
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
  socialStats: function() {
    let users = R.map(R.prop('login'), DB.GithubUsers.find().fetch())
    let socialUsers = R.concat(this.following, this.followers)
    let inter = R.intersection(users, socialUsers)
    return inter.length
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
});
