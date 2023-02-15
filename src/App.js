import './App.css';
import { Line } from 'react-chartjs-2';
import { useState } from 'react';


// global vars
let settings = {};
settings.start = -1;
settings.end = 1;
settings.step = 0.1;
settings.newtonX0 = 0.1;
settings.maxIterationCount = 50;

settings.graphStart = -4;
settings.graphEnd = 4;

let nodes = [];
let answers = [0,0,0];

// functions
let lineOptions = {
  scales: {
    yAxes: [
      {
        ticks: {
          beginAtZero: true,
        },
      },
    ],
    xAxes: [
      {
        ticks: {
          beginAtZero: true,
        },
      },
    ]
  },
};
let f = (x) => {
  let ans = 0;

  for (let i = 0; i < nodes.length; i++)
    ans += nodes[i].a * Math.pow(x, nodes[i].n);

  return ans;
}
let df = (x) => {
  let ans = 0;

  for (let i = 0; i < nodes.length; i++)
    if (nodes[i].n > 0)
      ans += nodes[i].a * nodes[i].n * Math.pow(x, nodes[i].n - 1);

  return ans;
}
let updateChart = () => {
  let keys = [];
  let values = [];

  if (settings.step < 0.0001) {
    return {};
  }

  if (settings.start >= settings.end) {
    return {};
  }

  for (let i = settings.graphStart; i <= settings.graphEnd; i += (-settings.graphStart + settings.graphEnd) / 500) {
    let v = Math.round(i * 100) / 100;
    let result = f(v);

    if (result > 0.5) result = undefined;
    if (result < -0.5) result = undefined;

    keys.push(v);
    values.push(result);
  }

  // solving
  let bisectional = new BisectionalMethod();
  let newton = new NewtonMethod();
  let chord = new ChordMethod();

  answers[0] = bisectional.getAnswer(settings.start, settings.end, settings.step);
  answers[1] = newton.getAnswer(settings.newtonX0, settings.step);
  answers[2] = chord.getAnswer(settings.start, settings.end, settings.step);

  return {
    labels: keys,
    datasets: [
      {
        label: 'Графік рівняння',
        data: values,
        fill: false,
        backgroundColor: 'rgb(230, 111, 0)',
        borderColor: 'rgb(230, 111, 0, 0.5)',
      },
    ],
  };
};

// parser
let parseNode = (str) => {

  let isNegative = false;
  let a = 1;
  let n = 0;
  let pointer = 0;

  if (str[pointer] == '-') {
    isNegative = true;
    pointer++;
  } 
  
  if (!isNaN(str[pointer])) {
    let _a = '';

    while (!isNaN(str[pointer]) || str[pointer] == '.')
      _a += str[pointer++];

    a = parseFloat(_a);
  }

  if (str[pointer] == 'x') {
    pointer++;
    if (str[pointer] != '^') {
      n = 1;
    } else {
      pointer++;

      let _n = '';

      while (!isNaN(str[pointer]) || str[pointer] == '.')
        _n += str[pointer++];

      n = parseFloat(_n);
    }
  }

  return {
    a: isNegative ? (-a) : a,
    n: n
  };
};
let parse = (str) => {
  str = str.replace(/ /g,'');

  let strs = str.split('-').join('+-').split('+');
  nodes = [];

  for (let i = 0; i < strs.length; ++i) {
    nodes.push(parseNode(strs[i]));
  }
};

// classes

class IEquation {
  f(x) {};
}

class Ploynimial extends IEquation {
  f(x) {
    let ans = 0;

    for (let i = 0; i < nodes.length; i++)
      ans += nodes[i].a * Math.pow(x, nodes[i].n);

    return ans;
  }
  df(x) {
    let ans = 0;
  
    for (let i = 0; i < nodes.length; i++)
      if (nodes[i].n > 0)
        ans += nodes[i].a * nodes[i].n * Math.pow(x, nodes[i].n - 1);
  
    return ans;
  }
}

class IMethod {
  getAnswer() {}
}
class BisectionalMethod extends IMethod {
  getAnswer(a, b, accuracy) {
    if (nodes.length < 1)
      return "ERROR";
      
    if (f(a) * f(b) >= 0) 
      return "Error: invalid parameters given (верхня та нижня грань мають однаковий знак)";

    let c = a;
    let i = 0;

    while ((b - a) >= accuracy && settings.maxIterationCount > i) {
        c = (a + b) / 2;

        if (f(c) == 0.0)
            break;

        else if (f(c) * f(a) < 0)
            b = c;
        else
            a = c;

        i++;
    }

    return c.toFixed(4);
  }
}
class NewtonMethod extends IMethod {
  getAnswer(x0, accuracy) {
    if (nodes.length < 1)
      return "ERROR";

    let h = f(x0) / df(x0);

    let i = 0;
    console.log('Tests passed, starting loop. x0 = ' + x0 + ', f(x0)=' + f(x0) + ', df(x0)=' + df(x0));
    while (Math.abs(h) >= accuracy && settings.maxIterationCount > i)
    {
        h = f(x0) / df(x0);
    
        x0 = x0 - h;
        i++;
    }

    return x0;
  }
}
class ChordMethod extends IMethod {
  getAnswer(a, b, accuracy) {
    if (nodes.length < 1)
      return "ERROR";

    let next = 0;
    let tmp;
    let i = 0;

    do {
      tmp = next;
      next = b - ((f(b) * (a - b)) / (f(a) - f(b)));
      a = b;
      b = tmp;
      ++i;
    } while (Math.abs(next - b) > accuracy && settings.maxIterationCount * 10 > i)

    if (isNaN(next)) {
      return "Error: invalid parameters given";
    }

    return next;
  }
}


//entry point
function App() {
  const [lineData, setLinedata] = useState([]);

  return (
    <>
      <header>
        <div className="container">
          <h1>Solver</h1>
          <p>Solve and plot non-linear equasions</p>
        </div>
      </header>
      <div className="content">
        <div className="container">
          <div className="row">
            <div className="block">
              <label>Equasion:</label><br />
              <input onChange={(val) => { parse(val.target.value); setLinedata(updateChart()); }}/> = 0
              <br />
              <label>Lower: <input className="small" onChange={(val) => { settings.start = parseFloat(val.target.value); setLinedata(updateChart()); }} type="number" defaultValue="-1" step="0.1"/></label> <br />
              <label>Upper: <input className="small" onChange={(val) => { settings.end = parseFloat(val.target.value); setLinedata(updateChart()); }} type="number" defaultValue="1" step="0.1"/></label> <br />
              <label>Uncertainty: <input className="small" min="0.0001" onChange={(val) => { settings.step = parseFloat(val.target.value); setLinedata(updateChart()); }} type="number" defaultValue="0.0001" step="0.0001" /></label> <br />
              <label>x<sub>0</sub> (only for Newton method): <input className="small" onChange={(val) => { settings.newtonX0 = parseFloat(val.target.value); setLinedata(updateChart()); }} type="number" defaultValue="1" step="0.1" /></label> <br />
              <p className="error" hidden>Error!</p>
              <p>
                Warning! Only polynomial functions are supported:
              </p>
              <ul>
                <li><b>x</b> &nbsp;&nbsp;&nbsp;variable</li>
                <li><b>+</b> &nbsp;&nbsp;&nbsp;addiction</li>
                <li><b>-</b> &nbsp;&nbsp;&nbsp;substraction</li>
                <li><b>^</b> &nbsp;&nbsp;&nbsp;power</li>
              </ul>
              <p>
                Sin, cos, e and so on are not supported yet.
              </p>
            </div>
            <div className="block">
              <label>Graph:</label>
              <div className="graph">
                <Line data={lineData} options={lineOptions}/>
              </div>
            </div>
          </div>
          <div className="row mt-30">
            <div className="col-third">
              <label>Bisection method answer</label>
              <p>x = {answers[0]}</p>
            </div>
            <div className="col-third">
              <label>Newton method answer</label>
              <p>x = {answers[1]}</p>
            </div>
            <div className="col-third">
              <label>Secant method answer</label>
              <p>x = {answers[2]}</p>
            </div>
          </div>
        </div>
      </div>
      <footer>
        <div className="container">
          <hr />
          <a href="http://github.com/sannnekk">sannnekk</a>
        </div>
      </footer>
    </>
  );
}

export default App;