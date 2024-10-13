import {
  useReducer,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const QuizContext = createContext();
const QuizDispatchContext = createContext();

const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

const initialState = {
  username: "",
  isLoggedIn: false,
  questions: [],
  currentQuestionIndex: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  totalAnswered: 0,
  isQuizFinished: false,
  timer: 10,
};

const quizReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        username: action.payload,
        isLoggedIn: true,
      };
    case "SET_QUESTIONS":
      return {
        ...state,
        questions: action.payload,
      };
    case "ANSWER_QUESTION": {
      const isCorrect =
        action.payload ===
        state.questions[state.currentQuestionIndex].correctAnswer;
      return {
        ...state,
        correctAnswers: isCorrect
          ? state.correctAnswers + 1
          : state.correctAnswers,
        wrongAnswers: !isCorrect ? state.wrongAnswers + 1 : state.wrongAnswers,
        totalAnswered: state.totalAnswered + 1,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        isQuizFinished:
          state.currentQuestionIndex + 1 >= state.questions.length ||
          state.timer <= 0,
      };
    }
    case "TICK":
      return {
        ...state,
        timer: state.timer - 1,
        isQuizFinished: state.timer - 1 <= 0 || state.isQuizFinished,
      };
    case "FINISH_QUIZ":
      return {
        ...state,
        isQuizFinished: true,
      };
    case "LOAD_STATE":
      return {
        ...action.payload,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
};

const Login = () => {
  const [username, setUsername] = useState("");
  const dispatch = useContext(QuizDispatchContext);

  const handleLogin = () => {
    if (username.trim() !== "") {
      dispatch({ type: "LOGIN", payload: username });
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Masukkan Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

const Timer = () => {
  const dispatch = useContext(QuizDispatchContext);
  const timer = useContext(QuizContext).timer;

  useEffect(() => {
    if (timer <= 0) {
      dispatch({ type: "FINISH_QUIZ" });
      return;
    }
    const interval = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, dispatch]);

  return (
    <div className="timer">
      <p>Waktu Tersisa: {timer} detik</p>
    </div>
  );
};

const QuizComponent = () => {
  const { questions, currentQuestionIndex, isQuizFinished, totalAnswered } =
    useContext(QuizContext);
  const dispatch = useContext(QuizDispatchContext);

  const handleAnswer = (choice) => {
    dispatch({ type: "ANSWER_QUESTION", payload: choice });
  };

  if (isQuizFinished) {
    return <ResultComponent />;
  }

  if (questions.length === 0) {
    return <p>Loading soal...</p>;
  }

  if (currentQuestionIndex >= questions.length) {
    dispatch({ type: "FINISH_QUIZ" });
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <p>
          Soal {currentQuestionIndex + 1} dari {questions.length}
        </p>
        <p>
          Telah Dijawab: {totalAnswered} / {questions.length}
        </p>
      </div>
      <h3 dangerouslySetInnerHTML={{ __html: currentQuestion.question }}></h3>
      <div className="choices-container">
        {currentQuestion.choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(choice)}
            dangerouslySetInnerHTML={{ __html: choice }}
          ></button>
        ))}
      </div>
    </div>
  );
};

const ResultComponent = () => {
  const { correctAnswers, wrongAnswers, totalAnswered, questions } =
    useContext(QuizContext);
  const dispatch = useContext(QuizDispatchContext);

  const handleRestart = () => {
    dispatch({ type: "RESET" });
  };

  return (
    <div className="result-container">
      <h2>Hasil Kuis</h2>
      <p>Jawaban Benar: {correctAnswers}</p>
      <p>Jawaban Salah: {wrongAnswers}</p>
      <p>
        Total Dijawab: {totalAnswered} dari {questions.length}
      </p>
      <button onClick={handleRestart}>Mulai Kuis Baru</button>
    </div>
  );
};

const App = () => {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  useEffect(() => {
    const savedState = localStorage.getItem("quizState");
    const savedUsername = localStorage.getItem("username");
    if (savedState) {
      dispatch({ type: "LOAD_STATE", payload: JSON.parse(savedState) });
    }
    if (savedUsername) {
      dispatch({ type: "LOGIN", payload: savedUsername });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("quizState", JSON.stringify(state));
    localStorage.setItem("username", state.username);
  }, [state]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (
        state.isLoggedIn &&
        state.questions.length === 0 &&
        !state.isQuizFinished
      ) {
        try {
          const res = await fetch(
            "https://opentdb.com/api.php?amount=10&type=multiple"
          );
          const data = await res.json();
          const formattedQuestions = data.results.map((item, index) => ({
            id: index + 1,
            question: item.question,
            choices: shuffleArray([
              ...item.incorrect_answers,
              item.correct_answer,
            ]),
            correctAnswer: item.correct_answer,
          }));
          dispatch({ type: "SET_QUESTIONS", payload: formattedQuestions });
        } catch (error) {
          console.error("Error fetching questions:", error);
        }
      }
    };
    fetchQuestions();
  }, [state.isLoggedIn, state.questions.length, state.isQuizFinished]);

  return (
    <QuizContext.Provider value={state}>
      <QuizDispatchContext.Provider value={dispatch}>
        <div className="app-container">
          <h1>QUIZ</h1>
          {!state.isLoggedIn ? (
            <Login />
          ) : (
            <>
              <p>Selamat Datang, {state.username}!</p>
              {!state.isQuizFinished && <Timer />}
              <QuizComponent />
            </>
          )}
        </div>
      </QuizDispatchContext.Provider>
    </QuizContext.Provider>
  );
};

export default App;
