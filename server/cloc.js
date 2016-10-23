'use strict'
import execOrig from 'exec'
import * as Kefir from 'kefir'
import R from 'ramda'

const exec = (cmds) => Kefir.fromCallback(cb => {
  execOrig(cmds, (err, out, code) => {
    if (err instanceof Error)
      throw err;
    cb(out)
  })
})

var repos = ["challenge-ai-budgets", "challenge-budget-busters", "challenge-cfr-calatori", "challenge-csfncsf", "challenge-easy-form-e", "challenge-ez-birocracy", "challenge-he-got-money-alert", "challenge-legi", "challenge-sanajscu", "challenge-semafoare", "challenge-udgov", "challenge-carnetdedonator", "challenge-finantari", "challenge-debt-md", "challenge-eyewitness", "challenge-green-city", "challenge-public-map", "challenge_public_tracker"]

let root = '/home/markets/repos/community2.jshacks.io'

const getRepo = repo =>
  exec(`cd ${root}/public && git clone git@github.com:jshacks/${repo}`)
    .map(x => repo)

const getCloc = repo =>
  exec([`${root}/node_modules/.bin/cloc`, '--exclude-dir=node_modules', '--json', `${root}/public/${repo}`])
    .map(x => JSON.parse(x))
    .map(R.omit('header'))
    .map(x => R.assoc(repo, x, {}))

Kefir
  .constant(repos)
  .flatten()
  .flatMap(getRepo)
  .flatMap(getCloc)
  .bufferWhile(R.T)
  .map(R.mergeAll)
  .onValue(x => console.log('Result', x))
