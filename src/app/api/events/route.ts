import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  const events = await prisma.event.findMany({
    where: { isActive: true },
    include: {
      registrations: userId ? { where: { userId } } : { select: { id: true } },
      _count: { select: { registrations: true } },
    },
    orderBy: { startDate: 'asc' },
  });

  const data = events.map((event) => ({
    ...event,
    registeredCount: event._count.registrations,
    isRegistered: userId ? event.registrations.length > 0 : false,
  }));

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, eventId } = body;

  if (!userId || !eventId) {
    return NextResponse.json(
      { success: false, error: 'userId and eventId are required' },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { registrations: true } } },
  });

  if (!event) {
    return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
  }

  if (event.capacity && event._count.registrations >= event.capacity) {
    return NextResponse.json({ success: false, error: 'Event is full' }, { status: 409 });
  }

  const registration = await prisma.eventRegistration.create({
    data: { userId, eventId },
  });

  return NextResponse.json({ success: true, data: registration }, { status: 201 });
}
