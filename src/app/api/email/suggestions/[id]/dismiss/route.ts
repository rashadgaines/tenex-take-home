import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get the suggestion
    const suggestion = await prisma.emailSuggestion.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: 'draft',
      },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    // Update the suggestion status
    await prisma.emailSuggestion.update({
      where: { id },
      data: { status: 'dismissed' },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to dismiss suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss suggestion' },
      { status: 500 }
    );
  }
}
