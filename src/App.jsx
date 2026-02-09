// function App() {
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
//       <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
//         <h1 className="text-4xl font-bold text-gray-800 mb-4 text-center">
//           E-Procurement App
//         </h1>
//         <p className="text-gray-600 mb-6 text-center">
//           Built with React + Vite + Tailwind CSS
//         </p>
//         <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md hover:shadow-lg">
//           Get Started
//         </button>

//         <div className="mt-6 pt-6 border-t border-gray-200">
//           <p className="text-sm text-gray-500 text-center">
//             Spring Boot Backend + MySQL Database
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;


// import { Button } from "@mui/material";

// function App() {
//   return (
//     <div>
//       <Button variant="contained">MUI Works 333</Button>
//     </div>
//   );
// }

// export default App;

import Layout from "./components/Layout";
import { Routes, Route } from "react-router-dom";
import { Typography } from "@mui/material";

const Dashboard = () => (
  <Typography variant="h4">Dashboard Page</Typography>
);

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
};

export default App;
