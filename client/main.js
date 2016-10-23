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
  Twig: 'http://jacob-walker.com/twig-talk/presentation/img/logo-twig.png',
  JSON: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/JSON_vector_logo.svg/2000px-JSON_vector_logo.svg.png',
  Markdown: 'http://kirkstrobeck.github.io/whatismarkdown.com/img/markdown.png',
  JavaScript: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Unofficial_JavaScript_logo_2.svg/480px-Unofficial_JavaScript_logo_2.svg.png',
  HTML: 'https://www.w3.org/html/logo/downloads/HTML5_Logo_512.png',
  Ruby: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Ruby_logo.svg/1000px-Ruby_logo.svg.png',
  YAML: 'http://freevector.co/wp-content/uploads/2013/11/56156-yml-document-black-interface-symbol-200x200.png',
  CSS: 'http://wpguru.co.uk/wp-content/uploads/2013/09/CSS-Logo-214x300.png',
  TypeScript: 'https://raw.githubusercontent.com/remojansen/logo.ts/master/ts.png',
  SASS: 'http://sass-lang.com/assets/img/styleguide/color-1c4aab2b.png',
  Pug: 'https://pbs.twimg.com/media/Ckaxc1pWEAAdhX2.jpg',
  'Bourne Shell': 'http://4.bp.blogspot.com/-ixV6xC69QJA/UAcgvglAv-I/AAAAAAAAAHs/7gqs9M9EVwg/s1600/bash.png',
  PHP: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/PHP-logo.svg/2000px-PHP-logo.svg.png',
  Elm: 'http://seeklogo.com/images/E/elm-logo-9DEF2A830B-seeklogo.com.png',
  XML: 'http://www.bunniktours.com.au/var/plain_site/storage/images/media/images/xml-logo/113656-1-eng-AU/xml-logo.png',
  Python: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1024px-Python-logo-notext.svg.png',
  Blade: 'http://kodeinfo.com/img/laravel_logo.png'
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

    console.log(totalCloc)
    return totalCloc
  },
  totalCommits: function () {
    let commits = DB.Commits.find().fetch()
    console.log(commits)

    return commits.length
  },
  logo: function () {
    return logos[this]
  },
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
