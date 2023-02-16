import moment from "moment/moment";
import React from "react";
import Rx from "rxjs";
import $ from "jquery";
import * as R from "ramda";

const Chapter6 = () => {
  return (
    <>
      {/* <Chapter6_1 /> */}
      {/* <Chapter6_2 /> */}
      {/* <Chapter6_4 /> */}
      {/* <Chapter6_5 /> */}
      {/* <Chapter6_8 /> */}
      <Chapter6_6 />
    </>
  );
};

const Chapter6_6 = () => {
  Rx.Observable.forkJoin(Rx.Observable.of(42), Rx.Observable.interval(1000).take(5)).subscribe(
    console.log
  );
  return <div>Chapter6_6</div>;
};

const Chapter6_1 = () => {
  function startWith(value) {
    console.log("this111", this);
    return Rx.Observable.create((subscriber) => {
      let source = this; // 이전에 체이닝된 옵저버블 전체를 의미
      console.log("this", this);
      try {
        subscriber.next(value);
      } catch (err) {
        subscriber.error(err);
      }
      return source.subscribe(subscriber);
    });
  }

  Rx.Observable.prototype.startWith = startWith;
  Rx.Observable.range(1, 5).timeout(1000).startWith(0).subscribe(console.log);
  return <div>Chapter6_1</div>;
};

const Chapter6_2 = () => {
  class SessionDisposable {
    constructor(sessionToken) {
      this.token = sessionToken;
      this.disposed = false;
      let expiration = moment().add(1, "days").toDate();
      document.cookie = `session_token=${sessionToken}; expires=${expiration.toUTCString()}`;
      console.log("Session created: " + this.token);
    }

    getToken() {
      return this.token;
    }

    // 해제(dispose)를 하는 함수를 제공해줘야 함
    unsubscribe() {
      if (!this.disposed) {
        this.disposed = true;
        this.token = null;
        document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        console.log("Ended session! This object has been disposed.");
      }
    }
  }
  // 렌덤한 토큰값 생성
  function generateSessionToken() {
    return "xyxyxyxy".replace(/[xy]/g, (c) => {
      return Math.floor(Math.random() * 10);
    });
  }
  // using() 연산자는 객체와 옵저버블 수명을 연결함
  const $countDownSession = Rx.Observable.using(
    () => new SessionDisposable(generateSessionToken()), // unsubscribe() 제공하여 자기 자신을 해제할수있는 객체
    () =>
      Rx.Observable.interval(1000) // 옵저버블을 만드는 함수
        .startWith(10) // 최초 한번만 실행
        .scan((val) => val - 1)
        .take(10)
  );

  $countDownSession.subscribe(console.log);
  return <div>Chapter6_2</div>;
};

const Chapter6_4 = () => {
  const letter$ = Rx.Observable.interval(1000) // 1초마다 0부터 1씩 증가 ex)0,1,2,3...
    .map((num) => String.fromCharCode(65 + num))
    .map((letter) => `Source 1 -> ${letter}`);

  const number$ = Rx.Observable.interval(1000).map((num) => `Source 2 -> ${num}`);

  Rx.Observable.combineLatest(letter$, number$).take(5).subscribe(console.log);
  return <div>Chapter6_4</div>;
};

const Chapter6_5 = () => {
  // https://www.manning.com/books/rxjs-in-action
  const API = "https://api-ssl.bitly.com";
  const LOGIN = "o_5l52m15f2e";
  const KEY = "R_9413bdcbaf224aaa924e7169bd7e5950";
  const getJSONAsObservable = Rx.Observable.bindCallback($.getJSON);
  const bitly$ = (url) =>
    Rx.Observable.of(url)
      .filter(R.compose(R.not, R.isEmpty))
      .map(encodeURIComponent)
      .map((encodedUrl) => `${API}/v3/shorten?longUrl=${encodedUrl}&login=${LOGIN}&apiKey=${KEY}`)
      .switchMap((url) => getJSONAsObservable(url).map(R.head))
      .filter((obj) => obj.status_code === 200 && obj.status_txt === "OK")
      .pluck("data", "url");

  const tiny$ = (url) =>
    Rx.Observable.of(url)
      .filter(R.compose(R.not, R.isEmpty))
      .map(encodeURIComponent)
      .map((encodedUrl) => `/external/tinyurl/api-create.php?url=${encodedUrl}`)
      .switchMap((url) => {
        return $.get(url);
      });

  const urlField = document.querySelector("#url");

  const isUrl = (str) => {
    var pattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
      "i"
    ); // fragment locator
    return pattern.test(str);
  };

  const url$ = Rx.Observable.fromEvent(urlField, "blur")
    .pluck("target", "value")
    .filter(isUrl)
    .switchMap((input) => Rx.Observable.combineLatest(bitly$(input), tiny$(input)))
    .subscribe(([bitly, tiny]) => {
      console.log(`From Bitly: ${bitly}`);
      console.log(`From TinyURL: ${tiny}`);
    });
  return (
    <div>
      {/* <label>Paste link here</label>
      <input type="text" id="url" /> */}
      Chapter6_4
    </div>
  );
};

const Chapter6_8 = () => {
  const Money = function (currency, val) {
    return {
      value: function () {
        return val;
      },
      currency: function () {
        return currency;
      },
      toString: function () {
        return `${currency} ${val}`;
      },
    };
  };

  const USDMoney = Money.bind(null, "USD");

  const csv = (str) => str.split(/,\s*/);

  // Proxying around CORS -> http://download.finance.yahoo.com
  const webservice = "/external/yahoo/d/quotes.csv?s=$symbol&f=sa&e=.csv";

  const ajax = (url) =>
    new Promise((resolve, reject) => {
      let req = new XMLHttpRequest();
      req.open("GET", url);
      req.onload = function () {
        if (req.status == 200) {
          let data = req.responseText;
          resolve(data);
        } else {
          reject(new Error(req.statusText));
        }
      };
      req.onerror = function () {
        reject(new Error("IO Error"));
      };
      req.send();
    });

  const requestQuote$ = (symbol) =>
    Rx.Observable.fromPromise(ajax(webservice.replace(/\$symbol/, symbol)))
      .map((response) => response.replace(/"/g, ""))
      .map(csv);

  const twoSecond$ = Rx.Observable.interval(2000);

  const fetchDataInterval$ = (symbol) => twoSecond$.mergeMap(() => requestQuote$(symbol));

  const symbols = ["FB", "AAPL", "CTXS"];

  const add = (x, y) => x + y;

  Rx.Observable.forkJoin(symbols.map(requestQuote$))
    .map((data) => data.map((arr) => parseInt(arr[1])))
    .subscribe((allPrices) => {
      console.log("Total Portfolio Value: " + new USDMoney(allPrices.reduce(add).toLocaleString()));
    });
  return <div>Chapter6_8</div>;
};

export default Chapter6;
