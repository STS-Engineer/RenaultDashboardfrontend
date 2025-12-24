import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";

import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";

import UploadCsv from "./pages/Renault/UploadCsv";
import TestViewer from "./pages/Renault/TestViewer";

import { ScrollToTop } from "./components/common/ScrollToTop";

export default function App() {
  return (
    <Router>
      <ScrollToTop />

      <Routes>
        <Route element={<AppLayout />}>
          <Route index path="/" element={<UploadCsv />} />
          <Route path="/upload" element={<UploadCsv />} />
          <Route path="/tests" element={<TestViewer />} />
        </Route>

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
