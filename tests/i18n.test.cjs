const { test } = require('node:test');
const assert = require('node:assert/strict');
const Locale = require('./helpers/locale.cjs');

test('Japanese translates reviewed copy and preserves punctuation', () => {
  const { t } = Locale.create('ja');
  assert.equal(t('오늘의 할 일'), '今日のタスク');
  assert.equal(t('무엇을 할까요?'), '何をしますか？');
  assert.equal(t('할 일이 없습니다.'), 'タスクはありません。');
  assert.equal(t('이전 주'), '前の週');
  assert.equal(t('높음'), '高');
});

test('tagged templates preserve user titles, project names and notes verbatim', () => {
  const { html } = Locale.create('ja');
  const title = '오늘의 할 일', project = '프로젝트', note = '메모 <b>원문</b>';
  assert.equal(html`<h2>오늘의 할 일</h2><p>${title}</p><p>${project}</p><p>${note}</p>`,
    '<h2>今日のタスク</h2><p>오늘의 할 일</p><p>프로젝트</p><p>메모 <b>원문</b></p>');
});

test('unknown Korean words are not corrupted by matching individual syllables', () => {
  const { t } = Locale.create('ja');
  assert.equal(t('알수없는문장'), '알수없는문장');
  assert.equal(t('할 일이 없습니다!'), '할 일이 없습니다!');
});

test('Korean and unsupported language settings preserve the source copy', () => {
  assert.equal(Locale.create('ko').t('오늘의 할 일'), '오늘의 할 일');
  assert.equal(Locale.create('unsupported').language, 'ko');
  assert.equal(Locale.create('ja').locale, 'ja-JP');
});
