import { Injectable } from '@nestjs/common';

export type MoodType = 'happy' | 'calm' | 'sad' | 'anxious' | 'stressed';

export interface MoodMessage {
  id: string;
  mood: MoodType;
  message: string;
  type: 'encouragement' | 'validation' | 'support' | 'celebration';
}

@Injectable()
export class MoodSupportService {
  private readonly moodMessages: Record<MoodType, MoodMessage[]> = {
    happy: [
      {
        id: '1',
        mood: 'happy',
        message:
          'Your joy is contagious! Keep spreading those positive vibes and remember to savor these beautiful moments. 🌟',
        type: 'celebration',
      },
      {
        id: '2',
        mood: 'happy',
        message:
          "It's wonderful to see you feeling so bright! Your happiness reminds us of all the good things life has to offer. ✨",
        type: 'celebration',
      },
      {
        id: '3',
        mood: 'happy',
        message:
          'Your smile lights up the world! Hold onto this feeling and let it fuel all your dreams and aspirations. 😊',
        type: 'encouragement',
      },
      {
        id: '4',
        mood: 'happy',
        message:
          'Happiness looks good on you! Remember, you deserve all the joy and good things coming your way. 🎉',
        type: 'validation',
      },
    ],
    calm: [
      {
        id: '5',
        mood: 'calm',
        message:
          'Your inner peace is inspiring. Take a moment to appreciate this tranquil state and carry it with you throughout the day. 🕊️',
        type: 'validation',
      },
      {
        id: '6',
        mood: 'calm',
        message:
          "In the stillness of this moment, you've found something beautiful. Let this calm energy guide your next steps. 🌿",
        type: 'encouragement',
      },
      {
        id: '7',
        mood: 'calm',
        message:
          "There's strength in your serenity. You're exactly where you need to be right now, and that's perfectly okay. 🌊",
        type: 'support',
      },
      {
        id: '8',
        mood: 'calm',
        message:
          'Your peaceful energy is a gift. Allow yourself to fully embrace this moment of clarity and balance. 🧘‍♀️',
        type: 'validation',
      },
    ],
    sad: [
      {
        id: '9',
        mood: 'sad',
        message:
          "It's okay to feel sad sometimes. Your emotions are valid, and this feeling won't last forever. You're stronger than you know. 💙",
        type: 'validation',
      },
      {
        id: '10',
        mood: 'sad',
        message:
          "I see you're going through a tough time. Remember, even the darkest nights lead to sunrise. You're not alone in this. 🌅",
        type: 'support',
      },
      {
        id: '11',
        mood: 'sad',
        message:
          "Your feelings matter, and it's brave of you to acknowledge them. Take things one moment at a time - you've got this. 🤗",
        type: 'encouragement',
      },
      {
        id: '12',
        mood: 'sad',
        message:
          'Sadness is part of being human. Let yourself feel it, but also remember all the beautiful moments that await you. 💜',
        type: 'validation',
      },
      {
        id: '13',
        mood: 'sad',
        message:
          "You don't have to carry this weight alone. Reach out when you need support - there are people who care about you. 🫂",
        type: 'support',
      },
    ],
    anxious: [
      {
        id: '14',
        mood: 'anxious',
        message:
          "Take a deep breath with me. In... and out. You're safe right now, and you have the strength to handle whatever comes next. 🌬️",
        type: 'support',
      },
      {
        id: '15',
        mood: 'anxious',
        message:
          "Anxiety can feel overwhelming, but it doesn't define you. You've overcome challenges before, and you can do it again. 💪",
        type: 'encouragement',
      },
      {
        id: '16',
        mood: 'anxious',
        message:
          'Your worries are understandable, but remember that most of what we fear never actually happens. Focus on this moment. 🌈',
        type: 'validation',
      },
      {
        id: '17',
        mood: 'anxious',
        message:
          "It's natural to feel anxious sometimes. Try to be gentle with yourself and remember that this feeling will pass. 🕊️",
        type: 'support',
      },
      {
        id: '18',
        mood: 'anxious',
        message:
          "You're braver than you believe and stronger than you seem. Trust in your ability to navigate through this moment. ⭐",
        type: 'encouragement',
      },
    ],
    stressed: [
      {
        id: '19',
        mood: 'stressed',
        message:
          "I can see you're carrying a lot right now. Remember, it's okay to take breaks and ask for help when you need it. 🌱",
        type: 'support',
      },
      {
        id: '20',
        mood: 'stressed',
        message:
          "Stress is your mind's way of saying you care deeply. Take a moment to pause, breathe, and prioritize what truly matters. 🧘‍♂️",
        type: 'validation',
      },
      {
        id: '21',
        mood: 'stressed',
        message:
          "You don't have to do everything at once. Break things down into smaller steps - you're more capable than you realize. 📝",
        type: 'encouragement',
      },
      {
        id: '22',
        mood: 'stressed',
        message:
          "This busy season won't last forever. Be kind to yourself and remember that your well-being comes first. 💚",
        type: 'support',
      },
      {
        id: '23',
        mood: 'stressed',
        message:
          "You're handling so much with grace, even if it doesn't feel that way. Give yourself credit for everything you're managing. 🌟",
        type: 'validation',
      },
    ],
  };

  async getConsolingMessage(mood: MoodType): Promise<MoodMessage> {
    const messages = this.moodMessages[mood];
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  async getAllMessagesForMood(mood: MoodType): Promise<MoodMessage[]> {
    return this.moodMessages[mood];
  }

  async getAvailableMoods(): Promise<
    { mood: MoodType; label: string; emoji: string }[]
  > {
    return [
      { mood: 'happy', label: 'Happy', emoji: '😊' },
      { mood: 'calm', label: 'Calm', emoji: '😌' },
      { mood: 'sad', label: 'Sad', emoji: '😢' },
      { mood: 'anxious', label: 'Anxious', emoji: '😰' },
      { mood: 'stressed', label: 'Stressed', emoji: '😤' },
    ];
  }
}
