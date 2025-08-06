import User, { IUser } from "../model/User.js";
import Planet, { IPlanet } from "../model/learning/Planet.js";
import Lesson, { ILesson } from "../model/learning/Lesson.js";
import HolyProject, { IHolyProject } from "../model/learning/HolyProject.js";
import mongoose from "mongoose";

interface IPlanetProgress {
  planetId: string;
  planetName: string;
  isFinished: boolean;
  courses: {
    completed: number;
    total: number;
    percentage: number;
  };
  project: {
    completed: boolean;
    score: number | null;
    requiredScore: number;
  };
}

class PlanetCompletionService {
  constructor() {
    this.checkAndUpdatePlanetCompletion = this.checkAndUpdatePlanetCompletion.bind(this);
    this.checkAndUpdatePlanetCompletionByPlanet = this.checkAndUpdatePlanetCompletionByPlanet.bind(this);
    this.getUserPlanetProgress = this.getUserPlanetProgress.bind(this);
  }

  /**
   * Vérifie toutes les planètes pour un utilisateur et ajoute les planètes terminées
   */
  async checkAndUpdatePlanetCompletion(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId).populate('holyProjects.project').lean();
      if (!user) {
        console.error(`User with id ${userId} not found`);
        return;
      }

      const planets = await Planet.find({}).lean();
      
      for (const planet of planets) {
        await this.checkAndUpdatePlanetCompletionByPlanet(userId, planet._id.toString());
      }
    } catch (error) {
      console.error("Error in checkAndUpdatePlanetCompletion:", error);
    }
  }

  /**
   * Vérifie une planète spécifique pour un utilisateur
   */
  async checkAndUpdatePlanetCompletionByPlanet(userId: string, planetId: string): Promise<void> {
    try {
      const user = await User.findById(userId).populate('holyProjects.project').lean();
      if (!user) {
        console.error(`User with id ${userId} not found`);
        return;
      }

      const planet = await Planet.findById(planetId).lean();
      if (!planet) {
        console.error(`Planet with id ${planetId} not found`);
        return;
      }

      // Vérifier si l'utilisateur a déjà terminé cette planète
      const alreadyFinished = user.planetsFinished.some(
        (finishedPlanet: any) => finishedPlanet._id?.toString() === planetId || finishedPlanet.toString() === planetId
      );

      if (alreadyFinished) {
        return; // Planète déjà terminée
      }

      // Vérifier les cours de la planète
      const planetCourses = await Lesson.find({ planet: planetId }).lean();
      const userFinishedCourses = user.lessonsFinished || [];
      
      const coursesCompleted = planetCourses.every(course => 
        userFinishedCourses.some((finishedCourse: any) => 
          finishedCourse._id?.toString() === course._id.toString() || finishedCourse.toString() === course._id.toString()
        )
      );

      // Vérifier le projet de la planète
      const planetProject = await HolyProject.findById(planet.projects).lean();
      if (!planetProject) {
        console.error(`Project for planet ${planetId} not found`);
        return;
      }

      const userProject = user.holyProjects.find(hp => 
        hp.project && (
          (hp.project as any)._id?.toString() === planetProject._id.toString() || 
          hp.project.toString() === planetProject._id.toString()
        ) && hp.resultPercent >= 80
      );

      const projectCompleted = !!userProject;

      // Si tous les cours sont terminés ET le projet est à 80% ou plus
      if (coursesCompleted && projectCompleted) {
        await User.findByIdAndUpdate(
          userId,
          { $addToSet: { planetsFinished: planetId } }
        );

        console.log(`User ${user.email} has completed planet: ${planet.name}`);
      }
    } catch (error) {
      console.error("Error in checkAndUpdatePlanetCompletionByPlanet:", error);
    }
  }

  /**
   * Récupère le progrès d'un utilisateur sur une planète spécifique
   */
  async getUserPlanetProgress(userId: string, planetId: string): Promise<IPlanetProgress | null> {
    try {
      const user = await User.findById(userId).populate('holyProjects.project').lean();
      if (!user) {
        console.error(`User with id ${userId} not found`);
        return null;
      }

      const planet = await Planet.findById(planetId).lean();
      if (!planet) {
        console.error(`Planet with id ${planetId} not found`);
        return null;
      }

      // Vérifier les cours
      const planetCourses = await Lesson.find({ planet: planetId }).lean();
      const userFinishedCourses = user.lessonsFinished || [];
      
      const completedCourses = planetCourses.filter(course => 
        userFinishedCourses.some((finishedCourse: any) => 
          finishedCourse._id?.toString() === course._id.toString() || finishedCourse.toString() === course._id.toString()
        )
      );

      // Vérifier le projet
      const planetProject = await HolyProject.findById(planet.projects).lean();
      const userProject = planetProject ? user.holyProjects.find(hp => 
        hp.project && (
          (hp.project as any)._id?.toString() === planetProject._id.toString() || 
          hp.project.toString() === planetProject._id.toString()
        )
      ) : null;

      const isFinished = completedCourses.length === planetCourses.length && 
                        !!(userProject && userProject.resultPercent >= 80);

      return {
        planetId: planetId,
        planetName: planet.name,
        isFinished,
        courses: {
          completed: completedCourses.length,
          total: planetCourses.length,
          percentage: planetCourses.length > 0 ? Math.round((completedCourses.length / planetCourses.length) * 100) : 0
        },
        project: {
          completed: !!(userProject && userProject.resultPercent >= 80),
          score: userProject?.resultPercent || null,
          requiredScore: 80
        }
      };
    } catch (error) {
      console.error("Error in getUserPlanetProgress:", error);
      return null;
    }
  }
}

export default PlanetCompletionService; 