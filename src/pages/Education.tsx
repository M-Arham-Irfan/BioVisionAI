
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Search, Heart, Baby, Users, UserRound, ArrowRight } from "lucide-react";

// Mock disease data
const diseaseData = [
  {
    id: 1,
    name: "Pneumonia",
    category: "respiratory",
    description: "Pneumonia is an infection that inflames the air sacs in one or both lungs. The air sacs may fill with fluid or pus, causing cough with phlegm or pus, fever, chills, and difficulty breathing.",
    symptoms: ["Chest pain when breathing or coughing", "Confusion or changes in mental awareness (in adults age 65 and older)", "Cough, which may produce phlegm", "Fatigue", "Fever, sweating and shaking chills", "Lower than normal body temperature (in adults older than age 65 and people with weak immune systems)", "Nausea, vomiting or diarrhea", "Shortness of breath"],
    causes: ["Bacteria", "Viruses", "Fungi", "Aspiration"],
    riskFactors: ["Smoking", "Weakened immune system", "Chronic diseases", "Recent viral infection"],
    prevention: ["Vaccination", "Good hygiene", "Quit smoking", "Stay healthy"],
    treatments: ["Antibiotics for bacterial pneumonia", "Cough medicine", "Fever reducers", "Rest and fluids"],
    image: "https://example.com/pneumonia.jpg",
  },
  {
    id: 2,
    name: "Diabetes",
    category: "endocrine",
    description: "Diabetes is a chronic disease that occurs either when the pancreas does not produce enough insulin or when the body cannot effectively use the insulin it produces.",
    symptoms: ["Increased thirst", "Frequent urination", "Extreme hunger", "Unexplained weight loss", "Presence of ketones in the urine", "Fatigue", "Irritability", "Blurred vision", "Slow-healing sores", "Frequent infections"],
    causes: ["Type 1: Autoimmune reaction", "Type 2: Insulin resistance", "Gestational: Hormonal changes during pregnancy"],
    riskFactors: ["Family history", "Weight", "Inactivity", "Age", "Gestational diabetes", "Polycystic ovary syndrome", "High blood pressure", "Abnormal cholesterol levels"],
    prevention: ["Healthy eating", "Physical activity", "Weight loss", "Regular check-ups"],
    treatments: ["Insulin therapy", "Oral medications", "Lifestyle changes", "Monitoring blood sugar"],
    image: "https://example.com/diabetes.jpg",
  },
  {
    id: 3,
    name: "Asthma",
    category: "respiratory",
    description: "Asthma is a condition in which your airways narrow, swell and produce extra mucus. This can make breathing difficult and trigger coughing, wheezing and shortness of breath.",
    symptoms: ["Shortness of breath", "Chest tightness or pain", "Trouble sleeping caused by shortness of breath, coughing or wheezing", "A whistling or wheezing sound when exhaling", "Coughing or wheezing attacks that are worsened by a respiratory virus"],
    causes: ["Airborne allergens", "Respiratory infections", "Physical activity", "Cold air", "Air pollutants and irritants", "Strong emotions and stress", "Medications"],
    riskFactors: ["Family history", "Allergies", "Obesity", "Smoking", "Exposure to occupational triggers", "Air pollution"],
    prevention: ["Avoid triggers", "Get vaccinated", "Identify and treat attacks early", "Take medications as prescribed"],
    treatments: ["Long-term control medications", "Quick-relief medications", "Allergy medications", "Bronchial thermoplasty"],
    image: "https://example.com/asthma.jpg",
  },
];

// Mock articles for different tabs
const generalArticles = [
  { id: 1, title: "Understanding Common Cold vs. Flu", image: "https://example.com/cold-vs-flu.jpg", category: "General Health" },
  { id: 2, title: "The Importance of Annual Health Check-ups", image: "https://example.com/checkup.jpg", category: "Preventive Care" },
  { id: 3, title: "Boosting Your Immune System Naturally", image: "https://example.com/immune.jpg", category: "Wellness" },
  { id: 4, title: "Managing Stress for Better Health", image: "https://example.com/stress.jpg", category: "Mental Health" },
  { id: 5, title: "Healthy Eating on a Budget", image: "https://example.com/healthy-eating.jpg", category: "Nutrition" },
];

const childCareArticles = [
  { id: 1, title: "Childhood Vaccinations: What Parents Need to Know", image: "https://example.com/vaccinations.jpg", category: "Child Health" },
  { id: 2, title: "Common Childhood Illnesses and How to Spot Them", image: "https://example.com/child-illness.jpg", category: "Child Health" },
  { id: 3, title: "Healthy Eating Habits for Growing Children", image: "https://example.com/child-eating.jpg", category: "Nutrition" },
  { id: 4, title: "Supporting Child Development Milestones", image: "https://example.com/development.jpg", category: "Development" },
];

const elderlyArticles = [
  { id: 1, title: "Fall Prevention for Seniors", image: "https://example.com/fall-prevention.jpg", category: "Safety" },
  { id: 2, title: "Managing Multiple Medications Safely", image: "https://example.com/medications.jpg", category: "Medication" },
  { id: 3, title: "Staying Active as You Age", image: "https://example.com/active-aging.jpg", category: "Fitness" },
  { id: 4, title: "Memory Care: Understanding Dementia and Alzheimer's", image: "https://example.com/memory.jpg", category: "Cognitive Health" },
];

const womenHealthArticles = [
  { id: 1, title: "Breast Cancer Awareness and Early Detection", image: "https://example.com/breast-cancer.jpg", category: "Cancer Prevention" },
  { id: 2, title: "Managing Menopause Symptoms", image: "https://example.com/menopause.jpg", category: "Women's Health" },
  { id: 3, title: "Prenatal Care Essentials", image: "https://example.com/prenatal.jpg", category: "Pregnancy" },
  { id: 4, title: "Understanding PCOS: Symptoms and Management", image: "https://example.com/pcos.jpg", category: "Women's Health" },
];

const Education = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDisease, setSelectedDisease] = useState<number | null>(null);
  
  const filteredDiseases = diseaseData.filter(disease => 
    disease.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const renderArticleList = (articles: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {articles.map(article => (
        <div key={article.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-gray-100 h-48 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-gray-400" />
          </div>
          <div className="p-4">
            <div className="text-xs text-medical-600 font-medium mb-1">{article.category}</div>
            <h3 className="font-medium mb-2">{article.title}</h3>
            <Button variant="link" className="p-0 h-auto" size="sm">
              Read Article <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
  
  const renderDiseaseDetails = () => {
    if (selectedDisease === null) return null;
    
    const disease = diseaseData.find(d => d.id === selectedDisease);
    if (!disease) return null;
    
    return (
      <Card>
        <CardHeader>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2 -ml-2"
            onClick={() => setSelectedDisease(null)}
          >
            ← Back to Diseases
          </Button>
          <CardTitle>{disease.name}</CardTitle>
          <CardDescription>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
              {disease.category.charAt(0).toUpperCase() + disease.category.slice(1)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="bg-gray-100 h-60 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="h-16 w-16 text-gray-400" />
            </div>
            <p>{disease.description}</p>
          </div>
          
          <div>
            <h3 className="font-medium text-lg mb-2">Symptoms</h3>
            <ul className="list-disc pl-5 space-y-1">
              {disease.symptoms.map((symptom, index) => (
                <li key={index}>{symptom}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-lg mb-2">Causes</h3>
            <ul className="list-disc pl-5 space-y-1">
              {disease.causes.map((cause, index) => (
                <li key={index}>{cause}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-lg mb-2">Risk Factors</h3>
            <ul className="list-disc pl-5 space-y-1">
              {disease.riskFactors.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-lg mb-2">Prevention</h3>
            <ul className="list-disc pl-5 space-y-1">
              {disease.prevention.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-lg mb-2">Treatments</h3>
            <ul className="list-disc pl-5 space-y-1">
              {disease.treatments.map((treatment, index) => (
                <li key={index}>{treatment}</li>
              ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Disclaimer: This information is for educational purposes only and not a substitute for professional medical advice.
          </div>
        </CardFooter>
      </Card>
    );
  };
  
  const renderDiseaseList = () => (
    <div className="mb-6">
      <div className="flex mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search diseases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {filteredDiseases.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500">No diseases found matching "{searchTerm}"</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDiseases.map(disease => (
            <Card key={disease.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDisease(disease.id)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{disease.name}</CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {disease.category.charAt(0).toUpperCase() + disease.category.slice(1)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-3">{disease.description}</p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="ml-auto">
                  Learn More
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <BookOpen className="mr-2 h-8 w-8" /> Health Education
        </h1>
        <p className="text-gray-600">Learn about various health conditions and get reliable information</p>
      </div>
      
      {selectedDisease !== null ? (
        renderDiseaseDetails()
      ) : (
        <Tabs defaultValue="diseases" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="diseases">
              <Heart className="h-4 w-4 mr-2" />
              Diseases Library
            </TabsTrigger>
            <TabsTrigger value="general">
              <UserRound className="h-4 w-4 mr-2" />
              General Health
            </TabsTrigger>
            <TabsTrigger value="children">
              <Baby className="h-4 w-4 mr-2" />
              Child Care
            </TabsTrigger>
            <TabsTrigger value="elderly">
              <Users className="h-4 w-4 mr-2" />
              Elderly Care
            </TabsTrigger>
            <TabsTrigger value="women">
              <UserRound className="h-4 w-4 mr-2" />
              Women's Health
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="diseases">
            {renderDiseaseList()}
          </TabsContent>
          
          <TabsContent value="general">
            {renderArticleList(generalArticles)}
          </TabsContent>
          
          <TabsContent value="children">
            {renderArticleList(childCareArticles)}
          </TabsContent>
          
          <TabsContent value="elderly">
            {renderArticleList(elderlyArticles)}
          </TabsContent>
          
          <TabsContent value="women">
            {renderArticleList(womenHealthArticles)}
          </TabsContent>
        </Tabs>
      )}
      
      <div className="mt-8 p-6 bg-medical-50 rounded-lg border border-medical-100">
        <h2 className="text-xl font-bold mb-4">Ask AI About Health</h2>
        <p className="mb-4">Have a health question? Ask our AI for reliable information.</p>
        <div className="flex">
          <Input placeholder="How can I prevent heart disease?" className="mr-2" />
          <Button>Ask</Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Disclaimer: AI responses are for informational purposes only and not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  );
};

export default Education;
