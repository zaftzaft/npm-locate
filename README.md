npm-locate
============

## 💨
クソ遅い npm search をいい感じする

## インストール

```
# npm i -g https://github.com/zaftzaft/npm-locate.git
```

## 使い方
1. データベースの同期(注意: 140MB ある)

```
$ npm-locate --update
```

+ 検索(パッケージ名から)

```
$ npm-locate -n <name>
```

![screenshot](https://raw.githubusercontent.com/zaftzaft/npm-locate/master/ss/byname.png)

+ キーワード、タグから

```
$ npm-locate -k <keyword>
```

![screenshot](https://raw.githubusercontent.com/zaftzaft/npm-locate/master/ss/bykeyword.png)

+

```
$ npm-locate -N got -v
```

## TODO
+ [ ] npm publish
+ [✔] JSON を stream な感じで処理させる
+ [ ] ダウンロード数順にソートできるようにする
+ [ ] 更新日時順にソート
